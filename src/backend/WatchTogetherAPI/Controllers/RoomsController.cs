using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Models;
using WatchTogetherAPI.Models.DTO;

namespace WatchTogetherAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : Controller
    {

        private readonly AppDbContext _context;
        private readonly ILogger<RoomsController> _logger;
        private readonly Random _random = new();

        public RoomsController(AppDbContext context, ILogger<RoomsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Rooms
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms()
        {
            return await _context.Rooms
                .Include(r => r.CreatedByUser)
                    .ThenInclude(u => u.CreatedRooms)
                .Include(r => r.Participants)
                    .ThenInclude(p => p.User)
                .Include(r => r.VideoState)
                    .ThenInclude(vs => vs.CurrentVideo)
                .ToListAsync();
        }

        // POST: api/Rooms/Create
        [HttpPost("Create")]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
        {
            // Начинаем транзакцию
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Генерация базового URL
                var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";

                // Создаем гостевого пользователя

                var guestUser = new User
                {
                    Username = GenerateRandomUsername(),
                    Status = UserStatus.UnAuthed,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(guestUser);
                await _context.SaveChangesAsync(); // Сохранение guestUser, чтобы получить UserId

                // После сохранения guestUser в базу добавьте установку куки
                Response.Cookies.Append(
                    "X-User-Id",
                    guestUser.UserId.ToString(),
                    new CookieOptions
                    {
                        Path = "/",
                        MaxAge = TimeSpan.FromDays(7),
                        SameSite = SameSiteMode.None, // Для кросс-доменных запросов
                        Secure = true,
                        HttpOnly = true,
                        IsEssential = true
                    }
                );

                // Создаем комнату
                var newRoom = new Room
                {
                    RoomName = request.RoomName,
                    Description = request.Description,
                    Status = request.Status,
                    CreatedByUserId = guestUser.UserId,      // Теперь у guestUser будет UserId
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddHours(24),
                    InvitationLink = "",
                    CreatedByUser = guestUser
                };

                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync();      // Сохранение newRoom, чтобы получить RoomId

                // Формируем полную ссылку
                newRoom.InvitationLink = $"{baseUrl}/room/{newRoom.RoomId}";
                await _context.SaveChangesAsync();

                // Добавляем участника

                var participant = new Participant
                {
                    RoomId = newRoom.RoomId, // Use the RoomId from the saved room
                    UserId = guestUser.UserId, // Use the UserId from the saved user
                    Role = ParticipantRole.Creator,
                    JoinedAt = DateTime.UtcNow
                };

                _context.Participants.Add(participant);
                await _context.SaveChangesAsync();

                // Фиксируем транзакцию
                await transaction.CommitAsync();

                var response = new
                {
                    newRoom.RoomId,
                    InvitationLink = $"/room/{newRoom.RoomId}",
                    User = new
                    {
                        guestUser.UserId,
                        guestUser.Username,
                        guestUser.Status
                    }
                };

                // Возвращаем статус 201 с телом ответа
                return new ObjectResult(response)
                {
                    StatusCode = StatusCodes.Status201Created
                };
            }
            catch (Exception ex)
            {
                // В случае ошибки откатываем транзакцию
                await transaction.RollbackAsync();

                _logger.LogError(ex, "Ошибка создания комнаты");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Rooms/{roomId}
        [HttpGet("{roomId:guid}")]      // Добавляем constraint для GUID, чтобы обрабатывался только guid
        public async Task<IActionResult> GetRoom(Guid roomId)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .Include(r => r.CreatedByUser)
                    .Include(r => r.VideoState) 
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео
                    .FirstOrDefaultAsync(r => r.RoomId == roomId);

                if (room == null)
                {
                    return NotFound(new { Message = "Комната не найдена" });
                }

                // Формируем полную ссылку если она не заполнена
                if (string.IsNullOrEmpty(room.InvitationLink))
                {
                    var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
                    room.InvitationLink = $"{baseUrl}/room/{room.RoomId}";
                    await _context.SaveChangesAsync();
                }

                // Получаем или создаем пользователя через Cookie
                var currentUser = await GetOrCreateUserAsync();

                // Основная логика добавления участника
                // Проверка наличия пользователя в списке участников комнаты, и если его там нет, добавляем его в базу данных как нового участника 

                if (currentUser.UserId != room.CreatedByUserId &&
                    !room.Participants.Any(p => p.UserId == currentUser.UserId))
                {
                    _context.Participants.Add(new Participant
                    {
                        RoomId = roomId,
                        UserId = currentUser.UserId,
                        Role = ParticipantRole.Member,
                        JoinedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();

                    // Обновляем данные комнаты после изменений
                    room = await _context.Rooms
                        .Include(r => r.Participants)
                            .ThenInclude(p => p.User)
                        .FirstOrDefaultAsync(r => r.RoomId == roomId);
                }

                // Формирование ответа
                var response = new
                {
                    currentUser.UserId,
                    Room = new
                    {
                        room.RoomId,
                        room.RoomName,
                        room.Description,
                        room.InvitationLink,
                        room.VideoState.CurrentVideo,
                        room.VideoState.IsPaused,
                        room.VideoState.CurrentTime,
                        Participants = room.Participants.Select(p => new
                        {
                            p.User.UserId,
                            p.User.Username
                        })
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting room {roomId}");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Rooms/{id}
        [HttpPut("{roomId:guid}")]
        public async Task<IActionResult> UpdateRoom(Guid roomId, [FromBody] UpdateRoomRequest request)
        {
            if (request.RoomName == null && request.Description == null)
            {
                return BadRequest("Необходимо указать новое название комнаты или описание.");
            }

            //Поиск комнаты по идентификатору
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null)
            {
                return NotFound(new { Message = "Комната не найдена" });
            }

            // Получаем текущего пользователя 
            var currentUser = await GetOrCreateUserAsync();

            if (currentUser == null)
            {
                return NotFound(new { Message = "Пользователь не найден" });
            }

            // Разрешаем изменять данные только создателю комнаты
            if (room.CreatedByUserId != currentUser.UserId)
            {
                // return Forbid();
                throw new Exception("Вы не создатель комнаты и не можете изменять настройки.");
            }

            if (request.RoomName != null)
            {
                room.RoomName = request.RoomName;
            }

            if (request.Description != null)
            {
                room.Description = request.Description;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при обновлении комнаты.");
                return StatusCode(500, "Ошибка при сохранении изменений.");
            }

            return Ok(new
            {
                room.RoomId,
                newRoomName = room.RoomName,
                newDescription = room.Description
            });
        }

        [HttpPost("{roomId:guid}/join")]
        public async Task<IActionResult> JoinChat(Guid roomId)
        {
            var user = await GetOrCreateUserAsync();
            var room = await _context.Rooms
                .Include(r => r.Participants)
                .Include(r => r.VideoState)
                    .ThenInclude(vs => vs.CurrentVideo)
                .FirstOrDefaultAsync(r => r.RoomId == roomId);

            if (room == null) return NotFound();

            if (!room.Participants.Any(p => p.UserId == user.UserId))
            {
                room.Participants.Add(new Participant
                {
                    UserId = user.UserId,
                    Role = ParticipantRole.Member,
                    JoinedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(); 
            }

            return Ok(new 
            { 
                user.UserId, 
                user.Username 
            });
        }

        [HttpPut("{roomId:guid}/video")]
        public async Task<IActionResult> UpdateVideo(Guid roomId, [FromBody] UpdateVideoRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео
                    .FirstOrDefaultAsync(r => r.RoomId == roomId);
                
                if (room == null) return NotFound("Комната не найдена");

                // Проверяем существование видео в базе
                var video = await _context.Videos
                    .FirstOrDefaultAsync(v => v.VideoId == request.VideoId);

                if (video == null)
                {
                    // Создаем новый экземпляр видео
                    video = new Video 
                    {
                        VideoId = request.VideoId,
                        Title = request.Title,
                        DurationInSeconds = request.DurationInSeconds,
                    };
                    _context.Videos.Add(video);
                }

                var currentUser = await GetOrCreateUserAsync();

                //if (!room.Participants.Any(p => p.UserId == currentUser.UserId))
                //{
                //    return Forbid("Вы не являетесь участником комнаты.");
                //};

                // Обновляем состояние комнаты
                room.VideoState.CurrentVideo = video;
                room.VideoState.CurrentTime = TimeSpan.Zero;
                room.VideoState.LastUpdated = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new{ 
                    room,
                    video
                });
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка добавления видео");
                await transaction.RollbackAsync();
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpPatch("{roomId:guid}/player")]
        public async Task<IActionResult> UpdateVideoState(Guid roomId, [FromBody] UpdateVideoStateRequest request)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(p => p.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео 
                    .FirstOrDefaultAsync(r => r.RoomId == roomId);
                
                if (room == null) return NotFound("Комната не найдена");

                var currentUser = await GetOrCreateUserAsync();

                // if (!room.Participants.Any(p => p.UserId == currentUser.UserId))
                // {
                //     return Forbid();
                // }
                
                if (request.IsPaused.HasValue) 
                {
                    room.VideoState.IsPaused = request.IsPaused.Value;
                }

                if (request.CurrentTimeInSeconds.HasValue)
                {
                    room.VideoState.CurrentTime = TimeSpan.FromSeconds(request.CurrentTimeInSeconds.Value);  // Конвертация времени в секундах в формат 00:00
                }
                
                room.VideoState.LastUpdated = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                
                return Ok(new {
                    room.VideoState.IsPaused,
                    CurrentTimeInSeconds = room.VideoState.CurrentTime.TotalSeconds,               // Возвращаем секунды
                    room.VideoState.LastUpdated
                }); 
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка обновления состояния плеера");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpDelete("{roomId:guid}/video")]
        public async Task<IActionResult> DeleteCurrentVideo(Guid roomId)
        {
            var room = await _context.Rooms
                .Include(r => r.VideoState)
                    .ThenInclude(vs => vs.CurrentVideo)
                .FirstOrDefaultAsync(r => r.RoomId == roomId);
                    
            if (room == null) return NotFound();

            if (room.VideoState.CurrentVideo == null)
            {
                return BadRequest("Room has no current video");
            }

            try
            {
                // Удаляем видео из БД:
                _context.Videos.Remove(room.VideoState.CurrentVideo);

                // Сбрасываем состояния плеера
                room.VideoState.IsPaused = true;
                room.VideoState.CurrentTime = TimeSpan.Zero;
                room.VideoState.LastUpdated = DateTime.UtcNow;
                room.VideoState.CurrentVideo = null;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка удаления видео из комнаты {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        private async Task<User> GetOrCreateUserAsync()
        {
            // Пробуем получить UserId из Cookie
            if (Request.Cookies.TryGetValue("X-User-Id", out var userIdCookie) &&
                Guid.TryParse(userIdCookie, out var userId))
            {
                var existingUser = await _context.Users.FindAsync(userId);
                if (existingUser != null)       // Если пользователь найден (user != null), метод сразу возвращает его.
                    return existingUser;
            }

            // Если идентификатор отсутствует, невалиден или пользователь с таким Guid не найден в базе данных, создаётся новый объект User:
            // Т.е. если пользователь - новый

            var newUser = new User
            {
                Username = GenerateRandomUsername(),
                Status = UserStatus.UnAuthed,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // Устанавливаем Cookie в ответе
            Response.Cookies.Append(
                "X-User-Id",
                newUser.UserId.ToString(),
                new CookieOptions
                {
                    Path = "/",                     // cookie будет доступно для всех страниц сайта
                    MaxAge = TimeSpan.FromDays(7),  // Срок жизни куки
                    SameSite = SameSiteMode.None,   
                    HttpOnly = true,                // cookie недоступно из JavaScript, что защищает от XSS-атак
                    Secure = true,                   // cookie передаётся только по HTTPS
                    IsEssential = true              // Для соблюдения GDPR
                }
            );

            return newUser;
        }

    
        // Генератор никнеймов
        private string GenerateRandomUsername(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
        }
    }
}
