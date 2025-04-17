using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
using WatchTogetherAPI.Services;

namespace WatchTogetherAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddDistributedMemoryCache(); // Используется для хранения сессий
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(20);
                options.Cookie.HttpOnly = true;
            });

            // Настройка JWT аутентификации с использованием схемы Bearer
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true, // Проверка ключа подписи
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(
                            builder.Configuration["Jwt:Key"] ?? "watchTogetherSecretKey12345!@#$%")), // Ключ для проверки подписи токена
                        ValidateIssuer = false, // Не проверяем издателя токена
                        ValidateAudience = false, // Не проверяем аудиторию токена
                        ValidateLifetime = true, // Проверяем срок действия токена
                        ClockSkew = TimeSpan.Zero // Без допуска на расхождение времени
                    };
                });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {   // Настройка сериализации JSON   
                    //options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddRazorPages();
            builder.Services.AddSignalR();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy/*.AllowAnyOrigin()*/
                          .WithOrigins("https://localhost:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .WithExposedHeaders("X-User-Id") // Разрешаем клиенту видеть X-User-Id
                          .AllowCredentials(); // Cookie
                });
            });

            builder.Services.AddHostedService<RoomCleanupService>();        // Сервис очистки комнат из БД
            builder.Services.AddHostedService<UserCleanupService>();        // Сервис очистки неактивных гостевых пользователей

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

            app.UseCors("AllowAll");

            app.UseSession();

            app.UseStaticFiles();           // Разрешаем статичные файлы из wwwroot

            // Добавляем middleware для аутентификации перед авторизацией
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.MapControllers();

            app.MapFallbackToFile("index.html");

            app.MapHub<MediaHub>("mediaHub");    // Хаб+логика

            app.Run();
        }
    }
}
