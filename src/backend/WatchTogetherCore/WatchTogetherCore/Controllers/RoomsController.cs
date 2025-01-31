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
            return await _context.Rooms.ToListAsync();
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
            try
            {
                // Создаем гостевого пользователя

                var guestUser = new User
                {
                    Username = GenerateRandomUsername(),
                    Status = UserStatus.UnAuthed,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(guestUser);
                await _context.SaveChangesAsync(); // Сохранение guestUser сразу, чтобы получить UserId

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
                    VideoUrl = "tempVideoUrl"
                };

                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync(); // Сохранение newRoom сразу, чтобы получить RoomId

                // Генерируем ссылку-приглашение

                newRoom.InvitationLink = $"/api/Rooms/{newRoom.RoomId}"; // Фиксим генерацию ссылки
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

                //newRoom.Participants.Add(participant);
                _context.Participants.Add(participant);
                await _context.SaveChangesAsync();

                // CreatedAtAction - перенаправление после создания комнаты
                // Это вернет статус 201 Created и установит заголовок Location с URL новой комнаты.
                // CreatedAtAction автоматически генерирует URL вида /api/Rooms/{roomId}

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

                return CreatedAtAction(
                    nameof(GetRoom),                                    // Имя целевого метода
                    new { roomId = newRoom.RoomId.ToString() },         // Параметры маршрута
                    response                                            // Тело ответа
                );
            }
            catch (Exception ex) 
            {
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

                // Получаем текущего пользователя из сессии/куков/токена

                var currentUser = await GetCurrentUserAsync();

                // Проверка доступа для приватных комнат

                if (room.Status == RoomStatus.Private)
                {
                    if (currentUser == null || !IsUserInRoom(currentUser, room))
                    {
                        return StatusCode(403, new { Message = "Access denied" });
                    }
                }

                var response = new
                {
                    RoomId = room.RoomId,
                    RoomName = room.RoomName,
                    Description = room.Description,
                    Status = room.Status.ToString(),
                    CreatedAt = room.CreatedAt,
                    ExpiresAt = room.ExpiresAt,
                    InvitationLink = room.InvitationLink,
                    VideoUrl = room.VideoUrl,
                    Creator = new
                    {
                        room.CreatedByUser.UserId,
                        room.CreatedByUser.Username
                    },
                    Participants = room.Participants.Select(p => new
                    {
                        p.User.UserId,
                        p.User.Username,
                        Role = p.Role.ToString(),
                        p.JoinedAt
                    })
                };

                return Ok(response);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting room {roomId}");
                return StatusCode(500, "Internal server error");
            }
        }


        // GET: Rooms/Edit/id


        // POST: Rooms/Edit/id


        // GET: Rooms/Delete/id


        // POST: Rooms/Delete/5



        private async Task<User> GetCurrentUserAsync()
        {
            // Реализация получения текущего пользователя
            // Например, через cookie или JWT токен
            // Для гостей можно создать нового пользователя

            // Пример простой реализации через заголовок
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

            if (Guid.TryParse(userIdHeader, out var userId))
            {
                return await _context.Users.FindAsync(userId);
            }

            // Для гостевых пользователей
            return null;
        }

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
