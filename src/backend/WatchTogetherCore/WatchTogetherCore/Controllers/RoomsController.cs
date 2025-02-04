using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using WatchTogetherCore.Data.AppDbContext;
using WatchTogetherCore.Models;
using WatchTogetherCore.Models.DTO;

namespace WatchTogetherCore.Controllers
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
            //return await _context.Rooms.ToListAsync();

            return await _context.Rooms
                .Include(r => r.CreatedByUser)
                    .ThenInclude(u => u.CreatedRooms)
                .Include(r => r.Participants)
                    .ThenInclude(p => p.User)
                .ToListAsync();
        }

        // GET: api/Rooms/Create

        [HttpGet("Create")]
        public IActionResult CreateRoom()
        {
            return View();
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
                    VideoUrl = "tempVideoUrl",
                    CreatedByUser = guestUser
                };

                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync();      // Сохранение newRoom, чтобы получить RoomId

                // Формируем полную ссылку
                newRoom.InvitationLink = $"{baseUrl}/api/Rooms/{newRoom.RoomId}";
                await _context.SaveChangesAsync();                      

                // Добавляем участника

                var participant = new Participant
                {
                    //User = guestUser,
                    //Room = newRoom,
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
                    RoomId = newRoom.RoomId,
                    InvitationLink = $"/api/Rooms/{newRoom.RoomId}",
                    User = new
                    {
                        guestUser.UserId,
                        guestUser.Username,
                        guestUser.Status
                    }
                };

                //// Добавление заголовка X-User-Id, для создателя комнаты
                //Response.Headers.Append("X-User-Id", guestUser.UserId.ToString());

                // CreatedAtAction - перенаправление после создания комнаты
                // Это вернет статус 201 Created и установит заголовок Location с URL новой комнаты.
                // CreatedAtAction автоматически генерирует URL вида /api/Rooms/{roomId}

                return CreatedAtAction(
                    nameof(GetRoom),                                    // Имя целевого метода
                    new { roomId = newRoom.RoomId.ToString() },         // Параметры маршрута
                    response                                            // Тело ответа
                );
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

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetRoom(Guid roomId)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)   
                    .Include(r => r.CreatedByUser)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId);

                if (room == null)
                {
                    return NotFound(new { Message = "Комната не найдена" });
                }

                // Формируем полную ссылку если она не заполнена
                if (string.IsNullOrEmpty(room.InvitationLink))
                {
                    var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
                    room.InvitationLink = $"{baseUrl}/api/Rooms/{room.RoomId}";
                    await _context.SaveChangesAsync();
                }

                // Получаем текущего пользователя
                //var currentUser = await GetCurrentUserAsync();

                // Создание или получение текущего пользователя

                var currentUser = await GetOrCreateUserAsync();
                //var isNewUser = currentUser.Status == UserStatus.UnAuthed;


                // Проверка на соответствие userId из localStorage (переданного в заголовке) с userId текущего пользователя
                // Получаем userId из заголовка
                var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
                Guid.TryParse(userIdHeader, out var headerUserId);

                // Проверяем, совпадает ли userId текущего пользователя с переданным в заголовке
                bool isUserIdValid = currentUser.UserId == headerUserId;

                // Проверка наличия пользователя в списке участников комнаты, и если его там нет, добавляет его в базу данных как нового участника 
                if (isUserIdValid &&
                    currentUser.UserId != room.CreatedByUserId && 
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
                }

                // Обновление данных комнаты
                room = await _context.Rooms
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId);

                // Формирование ответа
                var response = new
                {
                    UserId = currentUser.UserId,
                    Room = new
                    {
                        room.RoomId,
                        room.RoomName,
                        Participants = room.Participants.Select(p => new
                        {
                            p.User.UserId,
                            p.User.Username
                        })
                    }
                };

                //if (isNewUser)
                //{
                //    Response.Headers.Append("X-New-User-Id", currentUser.UserId.ToString());
                //}

                return Request.Headers["Accept"].ToString().Contains("text/html")
                    ? View("Room", room)
                    : Ok(response);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting room {roomId}");
                return StatusCode(500, "Internal server error");
            }
        }


        // PUT: api/Rooms/{id}

        [HttpPut("{roomId}")]
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
                return NotFound(new {Message = "Комната не найдена"});
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
                return Forbid();
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
                RoomId = room.RoomId,
                newRoomName = room.RoomName,
                newDescription = room.Description
            });
        }

        private async Task<User> GetOrCreateUserAsync()
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();   // Из заголовков запроса берётся значение по ключу "X-User-Id" (id пользователя).
                                                                                // Если заголовок отсутствует, FirstOrDefault() вернёт null.
            
            if (Guid.TryParse(userIdHeader, out var userId))
            {
                var user = await _context.Users.FindAsync(userId);          

                if (user != null)               // Если пользователь найден (user != null), метод сразу возвращает его.
                    return user;
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

            // Добавляется новый заголовок "X-New-User-Id" с идентификатором нового пользователя. 
            Response.Headers.Append("X-New-User-Id", newUser.UserId.ToString());
            
            return newUser;
        }



        // Проверка на наличие пользователя в комнате
        private bool IsUserInRoom(User user, Room room) =>
                    room.Participants.Any(p => p.UserId == user.UserId);


        // Генератор никнеймов
        private string GenerateRandomUsername(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
        }
    }
}
