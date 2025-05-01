using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
using WatchTogetherAPI.Models;
using WatchTogetherAPI.Models.DTO;
using Microsoft.Extensions.Configuration;

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
        private readonly IConfiguration _configuration;

        public RoomsController(AppDbContext context, ILogger<RoomsController> logger, IHubContext<MediaHub> hubContext, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _hubContext = hubContext;
            _configuration = configuration;
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

        // GET: api/Rooms/Public
        [HttpGet("Public")]
        public async Task<ActionResult<IEnumerable<Room>>> GetPublicRooms(CancellationToken cancellationToken = default)
        {
            try
            {
                var publicRooms = await _context.Rooms
                    .Where(r => r.Status == RoomStatus.Public)
                    .Include(r => r.CreatedByUser)
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .Select(r => new 
                    {
                        r.RoomId,
                        r.RoomName,
                        r.Description,
                        r.Status,
                        CreatedByUsername = r.CreatedByUser.Username,
                        ParticipantsCount = r.Participants.Count,
                        CurrentVideoTitle = r.VideoState.CurrentVideo != null ? r.VideoState.CurrentVideo.Title : null,
                        r.CreatedAt
                    })
                    .ToListAsync(cancellationToken);
                    
                return Ok(publicRooms);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение публичных комнат был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении публичных комнат");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // POST: api/Rooms/Create
        [HttpPost("Create")]
        public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request, CancellationToken cancellationToken = default)
        {
            // Начинаем транзакцию
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Получаем URL фронтенд-приложения из конфигурации или используем резервное значение
                var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") 
                  ?? _configuration["App:FrontendUrl"]
                  ?? "http://localhost:80";
                
                // var frontendUrl = "https://watchtogether-frontend.onrender.com";

                // Получаем существующего пользователя по кукам или создаем нового гостевого пользователя
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                
                // Если пользователь гостевой и запрос помечен как гостевой, делаем дополнительную обработку
                if (request.IsGuest && currentUser.Status == UserStatus.UnAuthed)
                {
                    // Проверяем, есть ли уже созданные комнаты у этого гостя
                    var existingGuestRooms = await _context.Rooms
                        .Where(r => r.CreatedByUserId == currentUser.UserId)
                        .ToListAsync(cancellationToken);

                    // Если у гостя уже есть хотя бы одна комната, запрещаем создание новой
                    if (existingGuestRooms.Any())
                    {
                        return BadRequest(new { Message = "В гостевом режиме можно создать только одну комнату. Чтобы создать больше комнат, пожалуйста, авторизуйтесь." });
                    }

                    _logger.LogInformation("Создание гостевой комнаты пользователем {UserId}", currentUser.UserId);
                }

                // Создаем комнату
                var newRoom = new Room
                {
                    RoomName = request.RoomName,
                    Description = request.Description,
                    Status = request.Status,
                    CreatedByUserId = currentUser.UserId,
                    CreatedAt = DateTime.UtcNow,
                    // Для гостей устанавливаем меньшее время жизни комнаты
                    ExpiresAt = currentUser.Status == UserStatus.UnAuthed 
                        ? DateTime.UtcNow.AddHours(3)  // 3 часа для гостевых комнат
                        : DateTime.UtcNow.AddHours(24), // 24 часа для авторизованных пользователей
                    InvitationLink = "",
                    CreatedByUser = currentUser
                };

                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync(cancellationToken);      // Сохранение newRoom, чтобы получить RoomId

                // Формируем полную ссылку
                newRoom.InvitationLink = $"{frontendUrl}/room/{newRoom.RoomId}";
                await _context.SaveChangesAsync(cancellationToken);

                // Добавляем участника (только если пользователь еще не является участником)
                var existingParticipant = await _context.Participants
                    .FirstOrDefaultAsync(p => p.RoomId == newRoom.RoomId && p.UserId == currentUser.UserId, cancellationToken);
                
                if (existingParticipant == null)
                {
                    try
                    {
                        var participant = new Participant
                        {
                            RoomId = newRoom.RoomId,
                            UserId = currentUser.UserId,
                            // Для публичных комнат создатель становится ведущим (Host)
                            Role = newRoom.Status == RoomStatus.Public ? ParticipantRole.Host : ParticipantRole.Creator,
                            JoinedAt = DateTime.UtcNow
                        };

                        _context.Participants.Add(participant);
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                    catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("PK_Participants") == true)
                    {
                        _logger.LogWarning("Пользователь {UserId} уже присоединен к комнате {RoomId}. Возможна гонка условий.", 
                            currentUser.UserId, newRoom.RoomId);
                        // Участник уже существует, игнорируем ошибку и продолжаем
                    }
                }

                // Фиксируем транзакцию
                await transaction.CommitAsync(cancellationToken);

                var response = new
                {
                    newRoom.RoomId,
                    InvitationLink = $"/room/{newRoom.RoomId}",
                    User = new
                    {
                        currentUser.UserId,
                        currentUser.Username,
                        currentUser.Status
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
                    var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") 
                        ?? _configuration["App:FrontendUrl"]
                        ?? "http://localhost:80";


                    room.InvitationLink = $"{frontendUrl}/room/{room.RoomId}";
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // Получаем или создаем пользователя через Cookie
                var currentUser = await GetOrCreateUserAsync(cancellationToken);

                // Основная логика добавления участника
                // Проверка наличия пользователя в списке участников комнаты, и если его там нет, добавляем его в базу данных как нового участника 
                if (currentUser.UserId != room.CreatedByUserId &&
                    !room.Participants.Any(p => p.UserId == currentUser.UserId))
                {
                    try
                    {
                        _context.Participants.Add(new Participant
                        {
                            RoomId = roomId,
                            UserId = currentUser.UserId,
                            Role = ParticipantRole.Member,
                            JoinedAt = DateTime.UtcNow
                        });

                        await _context.SaveChangesAsync(cancellationToken);
                    }
                    catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("PK_Participants") == true)
                    {
                        _logger.LogWarning("Пользователь {UserId} уже присоединен к комнате {RoomId}. Возможна гонка условий.", 
                            currentUser.UserId, roomId);
                        // Участник уже существует, игнорируем ошибку и продолжаем
                    }

                    // Обновляем данные комнаты после изменений
                    room = await _context.Rooms
                        .Include(r => r.Participants)
                            .ThenInclude(p => p.User)
                        .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                }

                // Формирование ответа
                // Определяем, может ли пользователь управлять видео:
                // 1. Если комната приватная - все участники могут управлять видео
                // 2. Если комната публичная - только создатель (Creator) или ведущий (Host) могут управлять видео
                var participant = room.Participants.FirstOrDefault(p => p.UserId == currentUser.UserId);
                var canControlVideo = room.Status == RoomStatus.Private || 
                                    (participant?.Role == ParticipantRole.Host || 
                                    participant?.Role == ParticipantRole.Creator);

                var response = new
                {
                    currentUser.UserId,
                    Room = new
                    {
                        room.RoomId,
                        room.RoomName,
                        room.Description,
                        room.InvitationLink,
                        room.CreatedByUserId,
                        room.Status,
                        room.VideoState.CurrentVideo,
                        room.VideoState.IsPaused,
                        room.VideoState.CurrentTime,
                        CanControlVideo = canControlVideo,
                        Participants = room.Participants.Select(p => new
                        {
                            p.User.UserId,
                            p.User.Username,
                            p.Role
                        }),
                        room.ExpiresAt
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

                // Проверяем лимит участников для публичных комнат
                if (room.Status == RoomStatus.Public && room.Participants.Count >= 5 && 
                    !room.Participants.Any(p => p.UserId == currentUser.UserId))
                {
                    return BadRequest(new { Message = "В публичной комнате уже максимальное количество участников (5)" });
                }

                // Проверяем, является ли пользователь участником комнаты
                var existingParticipant = await _context.Participants
                    .FirstOrDefaultAsync(p => p.RoomId == roomId && p.UserId == currentUser.UserId, cancellationToken);

                if (existingParticipant == null)
                {
                    try
                    {
                        var newParticipant = new Participant
                        {
                            RoomId = roomId,
                            UserId = currentUser.UserId,
                            Role = ParticipantRole.Member,
                            JoinedAt = DateTime.UtcNow
                        };
                        
                        _context.Participants.Add(newParticipant);
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                    catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("PK_Participants") == true)
                    {
                        _logger.LogWarning("Пользователь {UserId} уже присоединен к комнате {RoomId}. Возможна гонка условий.", 
                            currentUser.UserId, roomId);
                        // Участник уже существует, игнорируем ошибку и продолжаем
                    }
                }

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

        // Проверяет, может ли пользователь управлять видео в комнате
        private async Task<bool> CanUserControlVideoAsync(Guid roomId, Guid userId, CancellationToken cancellationToken = default)
        {
            var room = await _context.Rooms
                .Include(r => r.Participants)
                .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
            
            if (room == null) return false;
            
            // Для приватных комнат - все участники могут управлять видео
            if (room.Status == RoomStatus.Private) return true;
            
            // Для публичных комнат - только создатель комнаты (ведущий)
            var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
            return participant != null && (participant.Role == ParticipantRole.Host || participant.Role == ParticipantRole.Creator);
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
                    
                    // Если комната публичная, назначаем роль Host, иначе - Creator
                    oldestParticipant.Role = room.Status == RoomStatus.Public ? 
                        ParticipantRole.Host : ParticipantRole.Creator;
                    
                    // Удаляем текущего пользователя из участников
                    _context.Participants.Remove(participant);
                    await _context.SaveChangesAsync(cancellationToken);
                    await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("ParticipantsUpdated", cancellationToken);
                    
                    // Уведомляем всех участников о выходе пользователя
                    await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("UserLeft", participant.UserId.ToString(), participant.User?.Username.ToString() ?? "Unknown", cancellationToken);
                    
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

                // Уведомляем всех участников о выходе пользователя
                await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("UserLeft", participant.UserId.ToString(), participant.User?.Username.ToString() ?? "Unknown", cancellationToken);
                
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

                // Уведомляем всех участников о выходе пользователя
                await _hubContext.Clients.Group(room.RoomId.ToString()).SendAsync("UserLeft", participant.UserId.ToString(), participant.User?.Username.ToString() ?? "Unknown", cancellationToken);

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
            // _logger.LogDebug("**************************************************");
            // _logger.LogDebug("UpdateVideo: \nroomId: {RoomId} \nrequest.VideoId: {VideoId} \nrequest.Title: {Title} \nrequest.DurationInSeconds: {DurationInSeconds}", 
            //     roomId, request.VideoId, request.Title, request.DurationInSeconds);
            // _logger.LogDebug("**************************************************");   

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo) // Загружаем связанное видео
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null) return NotFound("Комната не найдена");

                var currentUser = await GetOrCreateUserAsync(cancellationToken);

                // Проверяем, имеет ли пользователь право управлять видео
                if (!await CanUserControlVideoAsync(roomId, currentUser.UserId, cancellationToken))
                {
                    return StatusCode(403, "В публичной комнате только ведущий может управлять видео");
                }

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
                        VideoType = request.VideoType // Добавляем поле типа видео
                    };
                    _context.Videos.Add(video);
                }
                // else
                // {
                //     // Обновляем данные существующего видео
                //     video.Title = request.Title;
                //     video.DurationInSeconds = request.DurationInSeconds;
                //     video.VideoType = request.VideoType; // Обновляем тип видео
                // }

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
                        CurrentVideo = room.VideoState?.CurrentVideo // Отправляем видео, чтобы у клиента автоматически добавлялось видео без перезагрузки страницы

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

        [HttpDelete("{roomId:guid}/video")]
        public async Task<IActionResult> DeleteCurrentVideo(Guid roomId, CancellationToken cancellationToken = default)
        {
            try 
            {
                var room = await _context.Rooms
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                        
                if (room == null) 
                {
                    _logger.LogWarning("Попытка удаления видео из несуществующей комнаты {RoomId}", roomId);
                    return NotFound(new { Message = "Комната не найдена" });
                }

                if (room.VideoState.CurrentVideo == null)
                {
                    _logger.LogWarning("Попытка удаления несуществующего видео из комнаты {RoomId}", roomId);
                    return BadRequest(new { Message = "В комнате нет активного видео" });
                }

                var currentUser = await GetOrCreateUserAsync(cancellationToken);

                // Проверяем, имеет ли пользователь право управлять видео
                if (!await CanUserControlVideoAsync(roomId, currentUser.UserId, cancellationToken))
                {
                    _logger.LogWarning("Пользователь {UserId} не имеет прав на удаление видео в комнате {RoomId}", 
                        currentUser.UserId, roomId);
                    return StatusCode(403, new { Message = "В публичной комнате только ведущий может удалять видео" });
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

                    _logger.LogInformation("Видео успешно удалено из комнаты {RoomId} пользователем {UserId}", 
                        roomId, currentUser.UserId);
                    return NoContent();
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Ошибка базы данных при удалении видео из комнаты {RoomId}", roomId);
                    return StatusCode(500, new { Message = "Ошибка удаления видео из базы данных" });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка при удалении видео из комнаты {RoomId}", roomId);
                    return StatusCode(500, new { Message = "Внутренняя ошибка сервера при удалении видео" });
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на удаление видео из комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, new { Message = "Запрос был отменен" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Необработанная ошибка при удалении видео из комнаты {RoomId}", roomId);
                return StatusCode(500, new { Message = "Внутренняя ошибка сервера" });
            }
        }

        // GET: api/Rooms/MyRooms
        // Получаем комнаты, созданные пользователем
        [HttpGet("MyRooms")]
        public async Task<ActionResult<IEnumerable<Room>>> GetUserRooms(CancellationToken cancellationToken = default)
        {
            try
            {
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                
                // Получаем комнаты, созданные пользователем
                var userRooms = await _context.Rooms
                    .Where(r => r.CreatedByUserId == currentUser.UserId)
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .Include(r => r.VideoState)
                        .ThenInclude(vs => vs.CurrentVideo)
                    .Select(r => new 
                    {
                        r.RoomId,
                        r.RoomName,
                        r.Description,
                        r.Status,
                        ParticipantsCount = r.Participants.Count,
                        CurrentVideoTitle = r.VideoState.CurrentVideo != null ? r.VideoState.CurrentVideo.Title : null,
                        r.CreatedAt,
                        CreatedByUserId = r.CreatedByUserId
                    })
                    .ToListAsync(cancellationToken);
                    
                return Ok(userRooms);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение комнат пользователя был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении комнат пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // DELETE: api/Rooms/{roomId}
        // Удаляет комнату
        [HttpDelete("{roomId:guid}")]
        public async Task<IActionResult> DeleteRoom(Guid roomId, CancellationToken cancellationToken = default)
        {
            try
            {
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null)
                {
                    return NotFound(new { Message = "Комната не найдена" });
                }

                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                
                // Проверяем, является ли пользователь создателем комнаты
                if (room.CreatedByUserId != currentUser.UserId)
                {
                    return StatusCode(403, new { Message = "Вы не являетесь создателем комнаты и не можете её удалить" });
                }
                
                // Удаляем всех участников комнаты
                _context.Participants.RemoveRange(room.Participants);
                
                // Удаляем комнату
                _context.Rooms.Remove(room);
                
                await _context.SaveChangesAsync(cancellationToken);
                
                // Уведомляем всех участников о закрытии комнаты
                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("RoomClosed", new { RoomId = roomId }, cancellationToken);
                
                return Ok(new { Message = "Комната успешно удалена" });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на удаление комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при удалении комнаты {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }
        
        // DELETE: api/Rooms/DeleteAll
        // Удаляет все комнаты пользователя
        [HttpDelete("DeleteAllRooms")]
        public async Task<IActionResult> DeleteAllRooms(CancellationToken cancellationToken = default)
        {
            try
            {
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                
                // Получаем все комнаты, созданные пользователем
                var userRooms = await _context.Rooms
                    .Include(r => r.Participants)
                    .Include(r => r.VideoState)
                    .Where(r => r.CreatedByUserId == currentUser.UserId)
                    .ToListAsync(cancellationToken);
                
                if (userRooms.Count == 0)
                {
                    return Ok(new { Message = "У вас нет комнат для удаления" });
                }
                
                // Для каждой комнаты уведомляем всех участников о закрытии
                foreach (var room in userRooms)
                {
                    // Удаляем всех участников комнаты
                    _context.Participants.RemoveRange(room.Participants);
                }
                
                // Удаляем все комнаты
                _context.Rooms.RemoveRange(userRooms);
                
                // Сохраняем изменения в базе данных
                await _context.SaveChangesAsync(cancellationToken);
                
                return Ok(new { Message = $"Все комнаты успешно удалены. Общее количество: {userRooms.Count}" });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на удаление всех комнат пользователя был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при удалении всех комнат пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // DELETE: api/Rooms/{roomId}/participants/{userId}
        // Удаляет участника из комнаты (только для создателя комнаты)
        [HttpDelete("{roomId:guid}/participants/{userId:guid}")]
        public async Task<IActionResult> RemoveParticipant(Guid roomId, Guid userId, CancellationToken cancellationToken = default)
        {
            try
            {
                // Получаем текущего пользователя
                var currentUser = await GetOrCreateUserAsync(cancellationToken);
                
                // Получаем комнату со всеми участниками
                var room = await _context.Rooms
                    .Include(r => r.Participants)
                        .ThenInclude(p => p.User)
                    .FirstOrDefaultAsync(r => r.RoomId == roomId, cancellationToken);
                
                if (room == null)
                {
                    return NotFound(new { Message = "Комната не найдена" });
                }
                
                // Проверяем, является ли текущий пользователь создателем комнаты
                if (room.CreatedByUserId != currentUser.UserId)
                {
                    return StatusCode(403, new { Message = "Только создатель комнаты может удалять участников" });
                }

                // Проверяем, не пытается ли создатель удалить сам себя
                if (userId == currentUser.UserId)
                {
                    return BadRequest(new { Message = "Вы не можете удалить себя из комнаты. Используйте выход из комнаты вместо этого." });
                }
                
                // Ищем участника, которого нужно удалить
                var participantToRemove = room.Participants.FirstOrDefault(p => p.UserId == userId);
                
                if (participantToRemove == null)
                {
                    return NotFound(new { Message = "Указанный пользователь не найден в комнате" });
                }

                // Сохраняем имя участника для уведомления
                var username = participantToRemove.User?.Username ?? "Неизвестный пользователь";
                
                // Удаляем участника
                _context.Participants.Remove(participantToRemove);
                await _context.SaveChangesAsync(cancellationToken);
                
                // Уведомляем всех участников через SignalR
                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("ParticipantsUpdated", cancellationToken);
                
                // Добавляем новое событие ParticipantRemoved для всех клиентов в группе
                await _hubContext.Clients.Group(roomId.ToString())
                    .SendAsync("ParticipantRemoved", userId.ToString(), username.ToString(), cancellationToken);
                
                // Уведомляем всех участников о выходе пользователя
                await _hubContext.Clients.Group(roomId.ToString()).SendAsync("UserLeft", userId.ToString(), username.ToString(), cancellationToken);

                return Ok(new { 
                    Message = $"Участник {username} успешно удален из комнаты",
                    RemovedUserId = userId
                });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на удаление участника из комнаты {RoomId} был отменен", roomId);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при удалении участника из комнаты {RoomId}", roomId);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        private async Task<User> GetOrCreateUserAsync(CancellationToken cancellationToken = default)
        {
            // Пробуем получить UserId из Cookie
            if (Request.Cookies.TryGetValue("X-User-Id", out var userIdCookie) &&
                Guid.TryParse(userIdCookie, out var userId))
            {
                _logger.LogInformation("Найден существующий идентификатор пользователя в cookie: {UserId}", userId);
                var existingUser = await _context.Users.FindAsync(userId, cancellationToken);
                if (existingUser != null)       // Если пользователь найден (user != null), метод сразу возвращает его.
                {
                    _logger.LogInformation("Найден существующий пользователь в базе данных: {UserId}, {Username}", existingUser.UserId, existingUser.Username);
                    return existingUser;
                }
                else
                {
                    _logger.LogWarning("Пользователь с ID {UserId} найден в cookie, но отсутствует в базе данных", userId);
                    
                    // Удаляем недействительный cookie
                    Response.Cookies.Delete("X-User-Id");
                }
            }
            else
            {
                _logger.LogInformation("Идентификатор пользователя не найден в cookie или невалиден");
            }

            // Проверяем наличие IP-адреса клиента для более точной идентификации гостей
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = HttpContext.Request.Headers.UserAgent.ToString();
            var fingerprint = $"{clientIp}_{userAgent}";
            
            // Пытаемся найти существующего гостевого пользователя с тем же IP/User-Agent
            var existingGuestUser = await _context.Users
                .Where(u => u.Status == UserStatus.UnAuthed && 
                            EF.Functions.Like(u.Username, $"guest_%") && 
                            u.Fingerprint == fingerprint &&
                            u.CreatedAt > DateTime.UtcNow.AddDays(-7))
                .FirstOrDefaultAsync(cancellationToken);
            
            if (existingGuestUser != null)
            {
                _logger.LogInformation("Найден существующий гостевой пользователь: {UserId}, {Username}", 
                    existingGuestUser.UserId, existingGuestUser.Username);
                
                // Устанавливаем cookie для этого пользователя
                SetUserCookie(existingGuestUser.UserId);
                
                return existingGuestUser;
            }

            // Если не нашли подходящего гостевого пользователя, создаем нового
            var newUser = new User
            {
                Username = GenerateRandomUsername(),
                Status = UserStatus.UnAuthed,
                CreatedAt = DateTime.UtcNow,
                Fingerprint = fingerprint
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Создан новый пользователь: {UserId}, {Username}", newUser.UserId, newUser.Username);
            
            // Устанавливаем Cookie в ответе
            SetUserCookie(newUser.UserId);

            return newUser;
        }

        // Вспомогательный метод для установки cookie пользователя
        private void SetUserCookie(Guid userId)
        {
            var cookieOptions = new CookieOptions
            {
                Path = "/",                     // cookie будет доступно для всех страниц сайта
                MaxAge = TimeSpan.FromDays(7),  // Срок жизни куки
                HttpOnly = true,                // cookie недоступно из JavaScript, что защищает от XSS-атак
                IsEssential = true,             // Для соблюдения GDPR
                SameSite = SameSiteMode.Lax     // По умолчанию Lax
            };
            
            // Настраиваем SameSite и Secure в зависимости от окружения
            if (HttpContext.Request.IsHttps)
            {
                cookieOptions.Secure = true;
                cookieOptions.SameSite = SameSiteMode.None;
            }

            Response.Cookies.Append("X-User-Id", userId.ToString(), cookieOptions);
        }

        // Генератор никнеймов
        private string GenerateRandomUsername(int length = 5)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            string randomUsername = "guest_" + new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
            return randomUsername;
        }
    }
}
