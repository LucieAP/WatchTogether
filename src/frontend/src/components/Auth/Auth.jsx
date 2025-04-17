import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import { login as apiLogin, register as apiRegister } from '../../api/auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7143';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true); // true - авторизация, false - регистрация
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // Переключаем между авторизацией и регистрацией
  const toggleForm = () => {  
    setIsLogin(!isLogin); // Переключаем между авторизацией и регистрацией
    setError(''); // Очищаем ошибку
  };

  // Проверяем, заполнены ли все поля
  const validateForm = () => {  
    if (!username.trim()) {
      setError('Имя пользователя обязательно');
      return false;
    }
    
    if (!password.trim()) {
      setError('Пароль обязателен');
      return false;
    }
    
    if (!isLogin && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return false;
    }
    
    if (!isLogin && password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    
    return true;
  };

  // Обрабатываем отправку формы
  const handleSubmit = async (e) => {
    e.preventDefault(); // Предотвращает перезагрузку страницы при отправке формы
    
    if (!validateForm()) return; // Если форма не валидна, то ничего не делаем
    
    try {
      setLoading(true); // Устанавливаем состояние загрузки
      setError('');
      
      let userData;
      
      if (isLogin) {
        // Используем функцию из auth.js для входа
        userData = await apiLogin(username, password);
      } else {
        // Используем функцию из auth.js для регистрации
        userData = await apiRegister(username, password, confirmPassword);
      }

      // Если ответ сервера содержит данные, то используем контекст для сохранения данных авторизации
      if (userData) {
        console.log("Авторизация прошла успешно", userData);

        // Используем контекст для сохранения данных авторизации
        login(userData);
        
        // Перенаправляем на главную страницу
        navigate('/');
      }
    } catch (err) {
      console.error('Ошибка аутентификации:', err);
      setError(
        err.message || 
        'Произошла ошибка при аутентификации. Пожалуйста, попробуйте снова.'
      );
    } finally {
      setLoading(false); // Снимаем состояние загрузки
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{isLogin ? 'Вход' : 'Регистрация'}</h1>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={loading}
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Подтверждение пароля</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Подтвердите пароль"
                disabled={loading}
              />
            </div>
          )}
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <p className="auth-toggle">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button type="button" onClick={toggleForm} className="toggle-button" disabled={loading}>
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth; 