using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
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
        private readonly IHubContext<MediaHub> _hubContext;

        public RoomsController(AppDbContext context, ILogger<RoomsController> logger, IHubContext<MediaHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _hubContext = hubContext;
        }

        // GET: api/Rooms
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms(CancellationToken cancellationToken = default)
        {
            return await _context.Rooms
                .Include(r => r.CreatedByUser)
                    .ThenInclude(u => u.CreatedRooms)
                .Include(r => r.Participants)
                    .ThenInclude(p => p.User)
                .Include(r => r.VideoState)
                    .ThenInclude(vs => vs.CurrentVideo)
                .ToListAsync(cancellationToken);
        }

        // POST: api/Rooms/Create
        [HttpPost("Create")]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request, CancellationToken cancellationToken = default)
        {
            // Начинаем транзакцию
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

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
                await _context.SaveChangesAsync(cancellationToken); // Сохранение guestUser, чтобы получить UserId

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
                await _context.SaveChangesAsync(cancellationToken);      // Сохранение newRoom, чтобы получить RoomId

                // Формируем полную ссылку
                newRoom.InvitationLink = $"{baseUrl}/room/{newRoom.RoomId}";
                await _context.SaveChangesAsync(cancellationToken);

                // Добавляем участника

                var participant = new Participant
                {
                    RoomId = newRoom.RoomId, // Use the RoomId from the saved room
                    UserId = guestUser.UserId, // Use the UserId from the saved user
                    Role = ParticipantRole.Creator,
                    JoinedAt = DateTime.UtcNow
                };

                _context.Participants.Add(participant);
                await _context.SaveChangesAsync(cancellationToken);

                // Фиксируем транзакцию
                await transaction.CommitAsync(cancellationToken);

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
            catch (OperationCanceledException)
            {
                // Обработка отмены операции
                _logger.LogInformation("Запрос на создание комнаты был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                // В случае ошибки откатываем транзакцию
                await transaction.RollbackAsync(cancellationToken);

                _logger.LogError(ex, "Ошибка создания комнаты");
                return StatusCode(500, "Internal server error");
            }
        }

        // GET: api/Rooms/{roomId}
        [HttpGet("{roomId:guid}")]      // Добавляем constraint для GUID, чтобы обрабатывался только guid
        public async Task<IActionResult> GetRoom(Guid roomId, CancellationToken cancellationToken = default)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .Include(r => r.CreatedByUser)
                    .Include(r => r.VideoState) 
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);

                if (room == null)
                {
                    return NotFound(new { Message = "Комната не найдена" });
                }

                // Формируем полную ссылку если она не заполнена
                if (string.IsNullOrEmpty(room.InvitationLink))
                {
                    var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
                    room.InvitationLink = $"{baseUrl}/room/{room.RoomId}";
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // Получаем или создаем пользователя через Cookie
                var currentUser = await GetOrCreateUserAsync(cancellationToken);

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

                    await _context.SaveChangesAsync(cancellationToken);

                    // Обновляем данные комнаты после изменений
                    room = await _context.Rooms
                        .Include(r => r.Participants)
                            .ThenInclude(p => p.User)
                        .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
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
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting room {roomId}");
                return StatusCode(500, "Internal server error");
            }
        }

        // PUT: api/Rooms/{id}
        [HttpPut("{roomId:guid}")]
        public async Task<IActionResult> UpdateRoom(Guid roomId, [FromBody] UpdateRoomRequest request, CancellationToken cancellationToken = default)
        {
            if (request.RoomName == null && request.Description == null)
            {
                return BadRequest("Необходимо указать новое название комнаты или описание.");
            }

            //Поиск комнаты по идентификатору
            var room = await _context.Rooms.FindAsync(roomId, cancellationToken);
            if (room == null)
            {
                return NotFound(new { Message = "Комната не найдена" });
            }

            // Получаем текущего пользователя 
            var currentUser = await GetOrCreateUserAsync(cancellationToken);

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
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на обновление комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
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
        public async Task<IActionResult> JoinChat(Guid roomId, CancellationToken cancellationToken = default)
        {
            try
            {
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);

                if (room == null) return NotFound(new { Message = "Комната не найдена" });

                if (!room.Participants.Any(p => p.UserId == currentUser.UserId))
                {
                    room.Participants.Add(new Participant
                    {
                        UserId = currentUser.UserId,
                        Role = ParticipantRole.Member,
                        JoinedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync(cancellationToken); 
                }

                // // Уведомление остальных участников о выходе пользователя
                // await _hubContext.Clients.Group(roomId.ToString()).SendAsync("UserJoined", new 
                // {
                //     UserId = currentUser.UserId,
                //     Username = currentUser.Username
                // });

                return Ok(new 
                { 
                    currentUser.UserId, 
                    currentUser.Username 
                });
            } 
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на присоединение к комнате {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при присоединении к комнате {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpPost("{roomId:guid}/leave")]
        public async Task<IActionResult> LeaveRoom(Guid roomId, [FromBody]LeaveRoomRequest request, CancellationToken cancellationToken = default)
        {
            try
            {
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null) return NotFound(new { Message = "Комната не найдена" });

                var participant = room.Participants.FirstOrDefault(p => p.UserId == currentUser.UserId);

                // Если пользователь не найден в списке участников, возвращаем ошибку
                if (participant == null)
                {
                    return BadRequest(new { Message = "Пользователь не является участником этой комнаты" });
                }

                // Если request null или LeaveType не указан, использует значение по умолчанию LeaveRoomType.Manual
                var leaveType = request?.LeaveType ?? LeaveRoomType.Manual; 
                var isCreator = room.CreatedByUserId == currentUser.UserId;

                switch (leaveType)
                {
                    case LeaveRoomType.Manual:
                        // Логика для ручного выхода из комнаты
                        return await HandleManualLeave(room, participant, isCreator, cancellationToken);
                    case LeaveRoomType.BrowserClose:
                        // Логика для выхода при закрытии вкладки/браузера
                        return await HandleBrowserClose(room, participant, isCreator, cancellationToken);
                    case LeaveRoomType.Timeout:
                        // Логика для выхода по таймауту
                        return await HandleTimeoutLeave(room, participant, isCreator); 
                    case LeaveRoomType.NetworkDisconnect:
                        // Логика для выхода при потере соединения
                        return await HandleNetworkDisconnect(room, participant, isCreator);
                    default:
                        // Для неопределенных случаев используем стандартное поведение
                        break;
                }

                return NoContent(); // Успешно удалено
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на выход из комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при выходе из комнаты {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        private async Task<IActionResult> HandleManualLeave(Room room, Participant participant, bool isCreator, CancellationToken cancellationToken = default)
        {
            // Если текущий пользователь - не создатель комнаты и в комнате больше нет участников, удаляем комнату
            if (isCreator)
            {
                // Если создатель комнаты выходит явно
                var otherParticipants = room.Participants.Where(p => p.UserId != participant.UserId).ToList();

                if (otherParticipants.Any())
                {
                    // Есть другие участники, передаем права старейшему участнику
                    var oldestParticipant = otherParticipants
                        .OrderBy(p => p.JoinedAt)
                        .First();
                    
                    room.CreatedByUserId = oldestParticipant.UserId;
                    oldestParticipant.Role = ParticipantRole.Creator;
                    
                    // Удаляем текущего пользователя из участников
                    _context.Participants.Remove(participant);
                    await _context.SaveChangesAsync(cancellationToken);
                    await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("ParticipantsUpdated", cancellationToken);
                    
                    // // Уведомляем всех о смене владельца
                    // await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("OwnershipChanged", new 
                    // {
                    //     RoomId = room.RoomId,
                    //     NewOwnerId = oldestParticipant.UserId,
                    //     NewOwnerUsername = oldestParticipant.User?.Username ?? "Unknown",
                    //     PreviousOwnerId = participant.UserId
                    // });
                    
                    // await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("UserLeft", new 
                    // {
                    //     UserId = participant.UserId,
                    //     Username = participant.User?.Username ?? "Unknown",
                    //     WasOwner = true
                    // });
                    
                    return Ok(new { 
                        Message = "Вы вышли из комнаты. Права владельца переданы другому участнику.",
                        NewOwnerId = oldestParticipant.UserId
                    });
                }
                else
                {
                    // Нет других участников, удаляем комнату
                    _context.Rooms.Remove(room);
                    await _context.SaveChangesAsync();
                    return Ok(new { Message = "Комната удалена, так как вы были последним участником." });
                }
            }
            else{
                // Обычный участник выходит
                _context.Participants.Remove(participant);
                await _context.SaveChangesAsync(cancellationToken);
                await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("ParticipantsUpdated", cancellationToken);


                // Уведомляем всех об уходе пользователя
                // await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("UserLeft", new 
                // {
                //     UserId = participant.UserId,
                //     Username = participant.User?.Username ?? "Unknown",
                //     WasOwner = false
                // });
                
                return Ok(new { Message = "Вы успешно вышли из комнаты." });
            }
        }
        private async Task<IActionResult> HandleBrowserClose(Room room, Participant participant, bool isCreator, CancellationToken cancellationToken = default)
        {
            // Если текущий пользователь - не создатель комнаты и в комнате больше нет участников, удаляем комнату
            if (isCreator)
            {
                return NoContent();
            }
            else{
                // Обычный участник выходит
                _context.Participants.Remove(participant);
                await _context.SaveChangesAsync(cancellationToken);
                await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("ParticipantsUpdated", cancellationToken);

                // Уведомляем всех об уходе пользователя
                return Ok(new { Message = "Вы успешно вышли из комнаты." });
            }
        }

        // Обработчик таймаута сессии
        private async Task<IActionResult> HandleTimeoutLeave(Room room, Participant participant, bool isCreator)
        {
            // При таймауте сессии выполняем те же действия, что и при явном выходе
            return await HandleManualLeave(room, participant, isCreator);
        }
        
        // Обработчик отключения сети
        private async Task<IActionResult> HandleNetworkDisconnect(Room room, Participant participant, bool isCreator)
        {
            // Похоже на обработку закрытия браузера, но с более коротким таймаутом
            // В этой реализации используем тот же подход для простоты
            return await HandleBrowserClose(room, participant, isCreator);
        }

        [HttpPut("{roomId:guid}/video")]
        public async Task<IActionResult> UpdateVideo(Guid roomId, [FromBody] UpdateVideoRequest request, CancellationToken cancellationToken = default)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null) return NotFound("Комната не найдена");

                // Проверяем существование видео в базе
                var video = await _context.Videos
                    .FirstOrDefaultAsync(v => v.VideoId == request.VideoId, cancellationToken);

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

                var currentUser = await GetOrCreateUserAsync(cancellationToken);

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

                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("VideoStateUpdated", new 
                    {
                        CurrentVideoId = room.VideoState?.CurrentVideo?.VideoId,
                        IsPaused = room.VideoState?.IsPaused ?? true,
                        CurrentTime = room.VideoState?.CurrentTime.TotalSeconds ?? 0,
                        // CurrentVideo = room.VideoState?.CurrentVideo
                    }, cancellationToken);

                return Ok(new{ 
                    room,
                    video
                });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на обновление видео в комнате {RoomId} был отменен", roomId);
                await transaction.RollbackAsync(cancellationToken);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка добавления видео");
                await transaction.RollbackAsync(cancellationToken);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpPatch("{roomId:guid}/player")]
        public async Task<IActionResult> UpdateVideoState(Guid roomId, [FromBody] UpdateVideoStateRequest request, CancellationToken cancellationToken = default)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(p => p.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео 
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null) return NotFound("Комната не найдена");

                var currentUser = await GetOrCreateUserAsync(cancellationToken);

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

                await _context.SaveChangesAsync(cancellationToken);

                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("VideoStateUpdated", new 
                    {
                        CurrentVideoId = room.VideoState?.CurrentVideo?.VideoId,
                        IsPaused = room.VideoState?.IsPaused ?? true,
                        CurrentTime = room.VideoState?.CurrentTime.TotalSeconds ?? 0,
                        CurrentVideo = room.VideoState?.CurrentVideo
                    }, cancellationToken);
                
                return Ok(new {
                    room.VideoState.IsPaused,
                    CurrentTimeInSeconds = room.VideoState.CurrentTime.TotalSeconds,    // Возвращаем секунды
                    room.VideoState.LastUpdated
                }); 
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на обновление состояния плеера в комнате {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка обновления состояния плеера");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        [HttpDelete("{roomId:guid}/video")]
        public async Task<IActionResult> DeleteCurrentVideo(Guid roomId, CancellationToken cancellationToken = default)
        {
            var room = await _context.Rooms
                .Include(r => r.VideoState)
                    .ThenInclude(vs => vs.CurrentVideo)
                .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                    
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

                await _context.SaveChangesAsync(cancellationToken);

                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("VideoStateUpdated", new 
                    {
                        CurrentVideoId = (string)null,
                        IsPaused = true,
                        CurrentTime = 0,
                        CurrentVideo = (object)null
                    }, cancellationToken);

                return NoContent();
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на удаление видео из комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Ошибка удаления видео из комнаты {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        private async Task<User> GetOrCreateUserAsync(CancellationToken cancellationToken = default)
        {
            // Пробуем получить UserId из Cookie
            if (Request.Cookies.TryGetValue("X-User-Id", out var userIdCookie) &&
                Guid.TryParse(userIdCookie, out var userId))
            {
                var existingUser = await _context.Users.FindAsync(userId, cancellationToken);
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
            await _context.SaveChangesAsync(cancellationToken);

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
