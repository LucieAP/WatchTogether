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

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Users

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        // GET: api/Users/{id}

        [HttpGet("{id}")]

        public async Task<ActionResult<User>> GetUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }


        // POST: api/users/login




    }
}
