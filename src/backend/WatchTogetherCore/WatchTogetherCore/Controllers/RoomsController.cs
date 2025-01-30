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
                    CreatedByUser = guestUser,      // Теперь у guestUser будет UserId
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddHours(24),
                    InvitationLink = "tempInvitationLink",
                    VideoUrl = "tempVideoUrl"
                };

                _context.Rooms.Add(newRoom);
                await _context.SaveChangesAsync(); // Сохранение newRoom сразу, чтобы получить RoomId

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

                return Ok(new
                {
                    RoomId = newRoom.RoomId,
                    InvitationLink = newRoom.InvitationLink,
                    User = new
                    {
                        guestUser.UserId,
                        guestUser.Username,
                        guestUser.Status
                    }
                });
            }
            catch (Exception ex) 
            {
                _logger.LogError(ex, "Ошибка создания комнаты");
                return StatusCode(500, "Internal server error");
            }
        }


        // GET: Rooms/Edit/id


        // POST: Rooms/Edit/id


        // GET: Rooms/Delete/id


        // POST: Rooms/Delete/5

        // Генератор никнеймов

        private string GenerateRandomUsername(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
        }
    }
}
