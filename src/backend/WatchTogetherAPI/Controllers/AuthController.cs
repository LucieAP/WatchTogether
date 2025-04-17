using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using WatchTogetherAPI.Data.AppDbContext;
using WatchTogetherAPI.Models;
using WatchTogetherAPI.Models.DTO;

namespace WatchTogetherAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration; // это сервис для получения конфигурации из appsettings.json
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext context, IConfiguration configuration, ILogger<AuthController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        // /api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken = default)
        {
            try
            {
                // Проверяем, существует ли пользователь с таким именем
                if (await _context.Users.AnyAsync(u => u.Username == request.Username, cancellationToken))
                {
                    return BadRequest(new { Message = "Пользователь с таким именем уже существует" });
                }

                // Создаем нового пользователя
                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = HashPassword(request.Password),  // Создает SHA256 хеш пароля 
                    Status = UserStatus.Authed,
                    CreatedAt = DateTime.UtcNow
                };

                // Добавляем пользователя в БД
                _context.Users.Add(user);
                await _context.SaveChangesAsync(cancellationToken);

                // Генерируем JWT токен для аутентификации нового пользователя в системе
                // Этот токен будет использоваться для авторизации запросов к API
                var token = GenerateJwtToken(user);
                var tokenExpires = DateTime.UtcNow.AddDays(7);  // Срок действия токена 7 дней, после этого пользователь должен будет заново авторизоваться в системе

                // Устанавливаем Cookie с идентификатором пользователя в ответе, сроком действия 7 дней
                // Этот Cookie будет использоваться для авторизации запросов к API
                Response.Cookies.Append(
                    "X-User-Id",
                    user.UserId.ToString(),
                    new CookieOptions
                    {
                        Path = "/",
                        MaxAge = TimeSpan.FromDays(7),
                        SameSite = SameSiteMode.None,   // разрешает доступ к Cookie из других сайтов
                        HttpOnly = true,  // true - запрещает доступ к Cookie из JavaScript
                        Secure = true,  // true - только по HTTPS
                        IsEssential = true  // true - Cookie является обязательным для всех запросов
                    }
                );

                // Возвращаем информацию о пользователе и токен
                return Ok(new AuthResponse
                {
                    UserId = user.UserId,
                    Username = user.Username,
                    Token = token,
                    TokenExpires = tokenExpires,
                    Status = user.Status
                });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на регистрацию был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при регистрации пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
        {
            try
            {
                // Ищем пользователя по имени
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken);

                // Если пользователь не найден или пароль неверный
                if (user == null || !VerifyPassword(request.Password, user.PasswordHash)) // VerifyPassword - метод для проверки пароля по хэшу
                {
                    return Unauthorized(new { Message = "Неверное имя пользователя или пароль" });
                }

                // Обновляем статус пользователя
                user.Status = UserStatus.Authed;
                await _context.SaveChangesAsync(cancellationToken);

                // Генерируем JWT токен
                var token = GenerateJwtToken(user);
                var tokenExpires = DateTime.UtcNow.AddDays(7);

                // Устанавливаем Cookie в ответе
                Response.Cookies.Append(
                    "X-User-Id",
                    user.UserId.ToString(),
                    new CookieOptions
                    {
                        Path = "/",
                        MaxAge = TimeSpan.FromDays(7),
                        SameSite = SameSiteMode.None,
                        HttpOnly = true,
                        Secure = true,
                        IsEssential = true
                    }
                );

                // Возвращаем информацию о пользователе и токен
                return Ok(new AuthResponse
                {
                    UserId = user.UserId,
                    Username = user.Username,
                    Token = token,
                    TokenExpires = tokenExpires,
                    Status = user.Status
                });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на вход был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при входе пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // /api/auth/logout
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(CancellationToken cancellationToken = default)
        {
            try
            {
                // Проверяем наличие куки с идентификатором пользователя
                // Получаем идентификатор пользователя из cookie
                if (Request.Cookies.TryGetValue("X-User-Id", out var userIdCookie) &&
                    Guid.TryParse(userIdCookie, out var userId))
                {
                    // Находим пользователя
                    var user = await _context.Users.FindAsync(userId, cancellationToken);
                    if (user != null)
                    {
                        // Обновляем статус пользователя
                        user.Status = UserStatus.UnAuthed;
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                }

                // Удаляем куки
                Response.Cookies.Delete("X-User-Id", new CookieOptions
                {
                    Path = "/",
                    SameSite = SameSiteMode.None,
                    Secure = true
                });

                return Ok(new { Message = "Вы успешно вышли из системы" });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на выход был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при выходе пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // /api/auth/me
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken = default)
        {
            try
            {
                // Проверяем наличие куки с идентификатором пользователя
                // Получаем идентификатор пользователя из cookie
                if (Request.Cookies.TryGetValue("X-User-Id", out var userIdCookie) &&
                    Guid.TryParse(userIdCookie, out var userId))
                {
                    // Находим пользователя
                    var user = await _context.Users.FindAsync(userId, cancellationToken);
                    if (user != null)
                    {
                        return Ok(new
                        {
                            user.UserId,
                            user.Username,
                            user.Status,
                            IsAuthenticated = user.Status == UserStatus.Authed
                        });
                    }
                }

                return Unauthorized(new { Message = "Пользователь не авторизован" });
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Запрос на получение текущего пользователя был отменен");
                return StatusCode(499, "Запрос был отменен");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при получении текущего пользователя");
                return StatusCode(500, "Внутренняя ошибка сервера");
            }
        }

        // Методы для хеширования и проверки пароля
        private string HashPassword(string password)
        {
            // Создаем SHA256 хеш пароля
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        // Метод для проверки пароля
        private bool VerifyPassword(string password, string hash)
        {
            // Создаем SHA256 хеш пароля
            var newHash = HashPassword(password);
            return newHash == hash;
        }

        // Метод для генерации JWT токена
        private string GenerateJwtToken(User user)
        {
            // _configuration["Jwt:Key"] - используется для получения значения секретного ключа из конфигурации.
            // ?? "defaultSecretKey123!@#$%^&*()" - используется для предоставления значения по умолчанию, если ключ не найден.
            // _configuration - это сервис для получения конфигурации из appsettings.json
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "defaultSecretKey123!@#$%^&*()");
            var tokenHandler = new JwtSecurityTokenHandler(); // это сервис для создания и проверки JWT токенов
            
            // Настройка параметров JWT токена
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                // Subject - это информация о пользователе, которая будет закодирована в JWT токене
                Subject = new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Name, user.Username)
                ]),
                // Expires - срок действия JWT токена
                Expires = DateTime.UtcNow.AddDays(7),
                // SigningCredentials - это учетные данные для подписи JWT токена
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);  // `CreateToken()` создает JWT на основе `tokenDescriptor
            return tokenHandler.WriteToken(token);  // `WriteToken()` преобразует JWT в строку
        }
    }
} 