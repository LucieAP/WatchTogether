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


        // GET: Rooms


        // GET: Rooms/Create

        // POST: Rooms/Create

        [HttpPost("create")]

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

                // Создаем комнату

                var newRoom = new Room
                {
                    RoomName = request.RoomName,
                    Description = request.Description,
                    Status = request.Status,
                    CreatedByUser = guestUser,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddHours(24),
                    InvitationLink = "tempInvitationLink",
                    VideoUrl = "tempVideoUrl"
                };

                _context.Rooms.Add(newRoom);

                // Добавляем участника

                var participant = new Participant
                {
                    User = guestUser,
                    Room = newRoom,
                    Role = ParticipantRole.Creator,
                    JoinedAt = DateTime.UtcNow
                };

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
                    //Participant = new
                    //{
                    //    Role = participant.Role,
                    //    JoinedAt = participant.JoinedAt
                    //}
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


        private string GenerateRandomUsername(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
        }
    }
}
