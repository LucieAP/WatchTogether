
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using WatchTogetherCore.Data.AppDbContext;
using WatchTogetherCore.Services;

namespace WatchTogetherCore
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddDistributedMemoryCache(); // Обязательно для хранения сессий
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(20);
                options.Cookie.HttpOnly = true;
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options => {              // Обработка циклических ссылок   
                    //options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddRazorPages();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy/*.AllowAnyOrigin()*/
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .WithExposedHeaders("X-User-Id") // Разрешаем клиенту видеть X-User-Id
                          .AllowCredentials(); // Cookie
                });
            });

            builder.Services.AddHostedService<RoomCleanupService>();        // Сервис очистки комнат из БД

            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString));


            builder.Services.AddRazorPages();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseSession();

            app.UseStaticFiles();           // разрешает отдавать файлы из wwwroot

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapControllers();

            app.UseCors("AllowAll");

            app.Run();
        }
    }
}
