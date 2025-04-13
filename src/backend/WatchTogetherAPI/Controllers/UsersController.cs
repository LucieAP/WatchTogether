using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Models;

namespace WatchTogetherAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : Controller
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(AppDbContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Users

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers(CancellationToken cancellationToken = default)
        {
            try
            {
                return await _context.Users.ToListAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение списка пользователей был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении списка пользователей");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // GET: api/Users/{id}

        [HttpGet("{id}")]

        public async Task<ActionResult<User>> GetUser(Guid id, CancellationToken cancellationToken = default)
        {
            try
            {
                var user = await _context.Users.FindAsync(id, cancellationToken);

                if (user == null)
                {
                    return NotFound(new { Message = "Пользователь не найден" });
                }

                return user;
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение пользователя {UserId} был отменен", id);
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении пользователя {UserId}", id);
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }


        // POST: api/users/login




    }
}
