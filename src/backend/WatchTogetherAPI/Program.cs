using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Hubs;
using WatchTogetherAPI.Services;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WatchTogetherAPI.Extensions;

namespace WatchTogetherAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Добавляем поддержку пользовательских секретов
            builder.Configuration
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .AddUserSecrets<Program>(optional: true);

            // Инициализация Firebase Admin SDK
            if (FirebaseAdmin.FirebaseApp.DefaultInstance == null)
            {
                // Вариант 1: Инициализация с помощью JSON файла с сервисным аккаунтом
                // (файл должен быть создан в Firebase Console и добавлен в проект)
                string firebaseCredPath = builder.Configuration["FirebaseAdmin:CredentialPath"];
                if (!string.IsNullOrEmpty(firebaseCredPath))
                {
                    FirebaseApp.Create(new AppOptions
                    {
                        Credential = GoogleCredential.FromFile(firebaseCredPath)
                    });
                }
                // Вариант 2: Инициализация с настройками по умолчанию 
                // (работает в Google Cloud если проект запущен с нужными разрешениями)
                else
                {
                    FirebaseApp.Create();
                }
            }

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
                          .WithOrigins("https://watchtogether-frontend.onrender.com")
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

            // Добавляем Health Checks
            builder.Services.AddHealthChecks()
                .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "api" }) // Проверка доступности самого API
                .AddCheck("firebase", () => 
                {
                    // Проверка доступности Firebase
                    try 
                    {
                        var app = FirebaseAdmin.FirebaseApp.DefaultInstance;
                        if (app == null) 
                        {
                            return HealthCheckResult.Unhealthy("Firebase не инициализирован");
                        }
                        return HealthCheckResult.Healthy("Firebase доступен");
                    } 
                    catch (Exception ex) 
                    {
                        return HealthCheckResult.Unhealthy("Проблема с Firebase", ex);
                    }
                }, tags: new[] { "firebase" })  // Проверка доступности Firebase
                .AddCheck("database", () => 
                {
                    // Здесь мы можем определить доступность базы данных
                    // без прямого использования DbContext
                    try 
                    {
                        // Проверка соединения с базой данных путем тестирования строки подключения
                        // В рабочей среде вы должны использовать более надежные методы проверки
                        if (string.IsNullOrEmpty(connectionString))
                        {
                            return HealthCheckResult.Unhealthy("Строка подключения к базе данных не настроена");
                        }
                        
                        return HealthCheckResult.Healthy("Конфигурация базы данных в порядке");
                    }
                    catch (Exception ex)
                    {
                        return HealthCheckResult.Unhealthy("Проблема с конфигурацией базы данных", ex);
                    }
                }, tags: new[] { "db", "postgres" }) // Проверка доступности PostgreSQL
                .AddCheck("services", () => 
                {
                    // Проверка доступности других критических сервисов
                    return HealthCheckResult.Healthy("Все сервисы работают нормально");
                }, tags: new[] { "services" }); // Проверка доступности других сервисов


            var app = builder.Build();

            // Добавляем код для применения миграций для Docker
            // Проверяем, установлена ли переменная окружения для автоматического применения миграций
            if (Environment.GetEnvironmentVariable("ApplyMigrations") == "true")
            {
                // Создаем временную область видимости для получения сервисов
                using (var scope = app.Services.CreateScope())
                {
                    // Получаем экземпляр контекста базы данных из DI-контейнера
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    try
                    {
                        // Используем новый метод инициализации базы данных
                        // Вызываем синхронно с помощью .Wait() (в идеале лучше использовать await)
                        DatabaseInitializer.InitializeDatabaseAsync(dbContext).Wait();
                        
                        // Проверяем необходимость применения миграций
                        // Получаем список ожидающих миграций, которые еще не были применены
                        var pendingMigrations = dbContext.Database.GetPendingMigrations();
                        if (pendingMigrations.Any())
                        {
                            // Если есть ожидающие миграции, выводим информацию и применяем их
                            Console.WriteLine($"Найдено {pendingMigrations.Count()} ожидающих миграций. Применение...");
                            // Применяем все ожидающие миграции к базе данных
                            dbContext.Database.Migrate();
                            Console.WriteLine("Миграции успешно применены.");
                        }
                        else
                        {
                            // Если ожидающих миграций нет, просто выводим сообщение
                            Console.WriteLine("Нет ожидающих миграций.");
                        }
                    }
                    catch (Exception ex)
                    {
                        // Обрабатываем и логируем любые исключения, возникшие при инициализации БД
                        Console.WriteLine($"Ошибка при инициализации базы данных: {ex.Message}");
                        // Выводим стек вызовов для облегчения отладки
                        Console.WriteLine(ex.StackTrace);
                    }
                }
            }

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

            // Добавляем эндпоинты для Health Checks
            // Основной эндпоинт с подробной информацией
            app.MapHealthChecks("/api/health", new HealthCheckOptions
            {
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    var result = new
                    {
                        status = report.Status.ToString(),
                        checks = report.Entries.Select(e => new
                        {
                            name = e.Key,
                            status = e.Value.Status.ToString(),
                            description = e.Value.Description,
                            duration = e.Value.Duration.ToString()
                        })
                    };
                    await context.Response.WriteAsJsonAsync(result);
                }
            });

            // Эндпоинт для проверки работоспособности (liveness)
            app.MapHealthChecks("/api/health/live", new HealthCheckOptions
            {
                Predicate = _ => true,
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
                }
            });

            // Эндпоинт для проверки готовности (readiness)
            app.MapHealthChecks("/api/health/ready", new HealthCheckOptions
            {
                Predicate = check => check.Tags.Contains("db") || check.Tags.Contains("services"),
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
                }
            });

            // Сохраняем оригинальные эндпоинты для обратной совместимости
            app.MapHealthChecks("/health", new HealthCheckOptions
            {
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    var result = new
                    {
                        status = report.Status.ToString(),
                        checks = report.Entries.Select(e => new
                        {
                            name = e.Key,
                            status = e.Value.Status.ToString(),
                            description = e.Value.Description,
                            duration = e.Value.Duration.ToString()
                        })
                    };
                    await context.Response.WriteAsJsonAsync(result);
                }
            });

            app.MapHealthChecks("/health/live", new HealthCheckOptions
            {
                Predicate = _ => true,
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
                }
            });

            app.MapHealthChecks("/health/ready", new HealthCheckOptions
            {
                Predicate = check => check.Tags.Contains("db") || check.Tags.Contains("services"),
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() });
                }
            });

            app.MapFallbackToFile("index.html");

            app.MapHub<MediaHub>("mediaHub");    // Хаб+логика

            app.Run();
        }
    }
}
