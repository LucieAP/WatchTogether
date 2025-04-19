import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

// Базовый компонент заголовка, содержащий общую логику
export default function BaseHeader({
  children, // Дополнительный контент, который будет отображаться между лого и блоком авторизации
  logoText = "WatchTogether", // Текст логотипа по умолчанию
}) {
  const navigate = useNavigate(); // Возвращает объект navigate, который используется для перенаправления на другие страницы
  const { isLoggedIn, username, logout } = useAuth();

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

  return (
    <header className="header">
      <div className="logo" onClick={handleHomePage}>
        {logoText}
      </div>

      {/* Слот для дополнительного контента */}
      {children}

      <div className="auth-controls">
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
