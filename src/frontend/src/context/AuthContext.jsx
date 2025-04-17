import { createContext, useState, useContext, useEffect } from 'react';
import { logout as apiLogout } from '../api/auth'; // Импортируем функцию logout из API
import { useNavigate, useLocation } from 'react-router-dom';

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
  const navigate = useNavigate();
  const location = useLocation();

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

  // Вычисляемое свойство - работает ли пользователь в гостевом режиме
  // Гостевой режим - это когда пользователь не авторизован
  const isGuest = !isLoggedIn;

  // Отслеживаем изменения авторизации и навигации по истории браузера
  // Этот хук используется для блокировки возврата в комнату при выходе из системы
  useEffect(() => {
    // Блокировка возврата в комнату при выходе из системы
    const handlePopState = () => {
      // Строго защищенные маршруты (требуют авторизации всегда)
      const strictProtectedRoutes = ['/profile'];
      
      // Маршруты, которые могут использовать гости
      const guestAllowedRoutes = ['/create-room', '/room/'];
      
      // Проверяем, пытается ли пользователь получить доступ к строго защищенному маршруту
      const isStrictProtectedRoute = strictProtectedRoutes.some(route => location.pathname.startsWith(route));
      
      // Проверяем наличие метки времени выхода
      const logoutTimestamp = sessionStorage.getItem('logout_timestamp');
      
      // Проверяем, является ли маршрут разрешенным для гостей
      const isGuestAllowedRoute = guestAllowedRoutes.some(route => location.pathname.startsWith(route));
      
      // Проверяем, был ли переход на страницу комнаты (/room/id) после создания комнаты
      const justCreatedRoom = sessionStorage.getItem('just_created_room');
      const isRoomRoute = location.pathname.startsWith('/room/');

      // Перенаправляем если:
      // 1. Это строго защищенный маршрут и пользователь не авторизован
      // 2. Маршрут с разрешенным гостевым доступом, но есть метка выхода
      if ((isStrictProtectedRoute && !isLoggedIn) || 
          (isGuestAllowedRoute && !isLoggedIn && logoutTimestamp && !isRoomRoute)) {
        // Перенаправляем на главную страницу
        navigate('/', { replace: true });
      }
      
      // Если мы находимся на странице комнаты и маркер создания комнаты установлен, удаляем его
      if (isRoomRoute && justCreatedRoom) {
        sessionStorage.removeItem('just_created_room');
      }
    };

    // Проверяем маршрут при каждом изменении авторизации или URL
    handlePopState();

    // Добавляем обработчик события popstate (когда пользователь нажимает кнопку "Назад" или "Вперед" в браузере)
    window.addEventListener('popstate', handlePopState);
    
    // Очищаем обработчик при размонтировании компонента
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoggedIn, location.pathname, navigate]);

  // Функция для входа пользователя
  const login = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userId', userData.userId);
    localStorage.setItem('username', userData.username);
    
    // Удаляем метку выхода из системы при входе
    sessionStorage.removeItem('logout_timestamp');
    
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
      
      // Записываем состояние выхода в sessionStorage для предотвращения возврата в комнату
      sessionStorage.setItem('logout_timestamp', Date.now().toString());
      
      // Перенаправляем на главную страницу и заменяем запись в истории
      navigate('/', { replace: true });
    }
  };

  // Значение контекста, которое будет доступно всем дочерним компонентам
  const value = {
    isLoggedIn,
    username,
    userId,
    isGuest,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 