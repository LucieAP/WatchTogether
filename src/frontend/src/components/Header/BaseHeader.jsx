import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./Header.css";

// Базовый компонент заголовка, содержащий общую логику
export default function BaseHeader({
  children, // Дополнительный контент, который будет отображаться между лого и блоком авторизации
  logoText = "WatchTogether", // Текст логотипа по умолчанию
  hideServerStatus = false, // Флаг для скрытия блока статуса сервера
}) {
  const navigate = useNavigate(); // Возвращает объект navigate, который используется для перенаправления на другие страницы
  const { isLoggedIn, username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Обрабатывает перенаправление на главную страницу
  const handleHomePage = () => {
    navigate("/");
  };

  // Обрабатывает перенаправление на страницу авторизации
  const handleLogin = () => {
    navigate("/auth");
  };

  // Обрабатывает выход из системы
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Обрабатывает перенаправление на страницу профиля
  const handleProfile = () => {
    navigate("/profile");
  };

  // Обрабатывает перенаправление на страницу статуса сервера
  const handleHealthStatus = () => {
    navigate("/health-status");
  };

  return (
    <header className="header">
      <div className="logo" onClick={handleHomePage}>
        {logoText}
      </div>

      {/* Слот для дополнительного контента */}
      {children}

      {!hideServerStatus && (
        <div className="server-status-nav-links">
          <button
            className="server-status-nav-link"
            onClick={handleHealthStatus}
          >
            Статус сервера
          </button>
        </div>
      )}

      <div className="auth-controls">
        {/* Переключатель темы */}
        <div className="theme-toggle">
          <span className="theme-toggle-icon">
            {theme === "dark" ? "🌙" : "☀️"}
          </span>
          <label className="theme-switch">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <span className="slider"></span>
          </label>
        </div>

        {isLoggedIn ? (
          <div className="user-info">
            <span className="username" onClick={handleProfile}>
              Привет, {username}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        ) : (
          <button className="login-button" onClick={handleLogin}>
            Войти
          </button>
        )}
      </div>
    </header>
  );
}
