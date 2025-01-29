
using Microsoft.EntityFrameworkCore;
using WatchTogetherCore.Data.AppDbContext;

namespace WatchTogetherCore
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddRazorPages();

            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            //builder.Services.AddDbContext<AppDbContext>(options =>
            //    options.UseNpgsql(connectionString));

            builder.Services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql(connectionString)
                        .LogTo(Console.WriteLine, LogLevel.Information) // Логи в консоль
                        .EnableSensitiveDataLogging());

            builder.Services.AddRazorPages();

            var app = builder.Build();

            // Автоматическое примениение миграций 

            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var dbContext = services.GetRequiredService<AppDbContext>();
                    dbContext.Database.Migrate(); // Применяем все pending миграции
                }
                catch (Exception ex)
                {
                    var logger = services.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "Произошла ошибка при применении миграций");
                }
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseSession();

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapControllers();

            app.Run();
        }
    }
}
