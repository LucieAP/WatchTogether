import { createContext, useState, useContext, useEffect } from 'react';
import { logout as apiLogout } from '../api/auth'; // Импортируем функцию logout из API

// Создаем контекст авторизации
const AuthContext = createContext(null);

// Хук для использования контекста авторизации
// Этот хук используется для получения данных из контекста авторизации (AuthContext), в любом компоненте приложения
export const useAuth = () => useContext(AuthContext);

// Провайдер контекста авторизации
// Компонент-обертка, который используется для предоставления данных авторизации всем дочерним компонентам
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);  // Авторизован ли пользователь
  const [username, setUsername] = useState('');  // Имя пользователя
  const [userId, setUserId] = useState(null);  // ID пользователя

  // Проверяем авторизацию при загрузке приложения
  // useEffect - это хук, который вызывается при изменении состояния компонента 

  // При монтировании компонента проверяется наличие токена и данных пользователя в localStorage. Если данные есть, пользователь считается авторизованным.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');
    
    // Если токен и имя пользователя существуют, то устанавливаем состояние авторизованного пользователя
    if (token && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
      setUserId(storedUserId);
    }
  }, []);

  // Функция для входа пользователя
  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('username', userData.username);
    
    setIsLoggedIn(true);
    setUsername(userData.username);
    setUserId(userData.userId);
  };

  // Функция для выхода пользователя
  const logout = async () => {
    try {
      // Отправляем запрос на выход на сервер для удаления cookie
      await apiLogout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      // Удаляем данные из localStorage независимо от результата запроса
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      
      setIsLoggedIn(false);
      setUsername('');
      setUserId(null);
    }
  };

  // Значение контекста, которое будет доступно всем дочерним компонентам
  const value = {
    isLoggedIn,
    username,
    userId,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 