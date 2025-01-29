using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WatchTogetherCore.Data.AppDbContext;
using WatchTogetherCore.Models;

namespace WatchTogetherCore.Controllers
{
    [Route("api/[controller]")]
    public class UsersController : Controller
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context) 
        {
            _context = context;       
        }

        // GET: api/users

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        // GET: api/users/5

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
