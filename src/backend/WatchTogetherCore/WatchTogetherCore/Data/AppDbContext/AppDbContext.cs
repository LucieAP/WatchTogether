using Microsoft.EntityFrameworkCore;

namespace WatchTogetherCore.Data.AppDbContext
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    }
}
