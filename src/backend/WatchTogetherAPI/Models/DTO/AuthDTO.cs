using System.ComponentModel.DataAnnotations;

namespace WatchTogetherAPI.Models.DTO
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Имя пользователя обязательно")]
        public required string Username { get; set; }

        [Required(ErrorMessage = "Пароль обязателен")]
        public required string Password { get; set; }
    }

    public class RegisterRequest
    {
        [Required(ErrorMessage = "Имя пользователя обязательно")]
        [MinLength(3, ErrorMessage = "Имя пользователя должно содержать минимум 3 символа")]
        [MaxLength(50, ErrorMessage = "Имя пользователя должно содержать максимум 50 символов")]
        public required string Username { get; set; }

        [Required(ErrorMessage = "Пароль обязателен")]
        [MinLength(6, ErrorMessage = "Пароль должен содержать минимум 6 символов")]
        public required string Password { get; set; }

        [Required(ErrorMessage = "Подтверждение пароля обязательно")]
        [Compare("Password", ErrorMessage = "Пароли не совпадают")]
        public required string ConfirmPassword { get; set; }
    }

    public class GoogleLoginRequest
    {
        [Required(ErrorMessage = "Токен обязателен")]
        public required string Token { get; set; }
    }

    public class AuthResponse
    {
        public Guid UserId { get; set; }
        public required string Username { get; set; }
        public required string Token { get; set; }
        public DateTime TokenExpires { get; set; }
        public UserStatus Status { get; set; }
    }
} 