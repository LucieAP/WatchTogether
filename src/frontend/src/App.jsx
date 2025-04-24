import { useState, memo, useCallback } from "react";
import { matchPath, useParams } from "react-router";
import "./App.css";
import CreateRoom from "./components/CreateRoom/CreateRoom";
import Header from "./components/Header/Header";
import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
import HomePage from "./components/HomePage/HomePage";
import RoomPage from "./components/RoomPage/RoomPage";
import RoomHeader from "./components/RoomPage/RoomHeader";
import GetRooms from "./components/GetRooms";
import Auth from "./components/Auth/Auth";
import Profile from "./components/Profile/Profile";
import { useRoomData } from "./hooks/useRoomData";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

// Оптимизируем HeaderSelector с помощью React.memo
const HeaderSelector = memo(function HeaderSelector() {
  const location = useLocation();
  const isRoomPage = matchPath({ path: "/room/:roomId" }, location.pathname); // Соответствует ли заданный URL текущему адресу

  return isRoomPage ? null : <Header />;
});

/**
 * Компонент для защиты маршрутов, требующих авторизации.
 *
 * Проверяет статус авторизации пользователя и решает, разрешить ли доступ к защищенному маршруту.
 * Если пользователь не авторизован и гостевой доступ не разрешен, или если пользователь недавно вышел
 * из системы и пытается получить доступ к защищенному маршруту, компонент перенаправляет на главную страницу.
 *
 * @param {Object} props - Свойства компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты, которые будут отображены при успешной авторизации
 * @param {boolean} props.allowGuest - Флаг, разрешающий доступ неавторизованным пользователям (по умолчанию true)
 * @param {boolean} props.checkLogoutTimestamp - Проверять ли метку времени выхода (по умолчанию true)
 * @returns {React.ReactNode} - Дочерние компоненты или перенаправление на главную страницу
 */

function ProtectedRoute({
  children,
  allowGuest = true,
  checkLogoutTimestamp = true,
}) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  // Получаем время последнего выхода из системы
  const logoutTimestamp = sessionStorage.getItem("logout_timestamp");

  // Проверяем, находимся ли мы на странице комнаты
  const isRoomRoute = location.pathname.startsWith("/room/");

  // Проверяем, был ли переход на страницу комнаты после создания комнаты
  const justCreatedRoom = sessionStorage.getItem("just_created_room");

  // Если мы находимся на странице комнаты и маркер создания комнаты установлен, удаляем его
  if (isRoomRoute && justCreatedRoom) {
    sessionStorage.removeItem("just_created_room");
  }

  // Проверяем условия доступа:
  const needsAuth = !allowGuest && !isLoggedIn; // Нужна авторизация, но пользователь не авторизован
  const hasRecentLogout =
    checkLogoutTimestamp && logoutTimestamp && !isLoggedIn; // Есть метка о недавнем выходе

  // Специальное исключение: если это маршрут комнаты и комната только что была создана,
  // разрешаем доступ даже после выхода из системы
  const isExceptionCase = isRoomRoute && justCreatedRoom;

  // Перенаправляем, если нужна авторизация или есть метка о выходе, и это не исключительный случай
  if ((needsAuth || hasRecentLogout) && !isExceptionCase) {
    // <Navigate> — это компонент из React Router, который при рендеринге выполняет навигацию на указанный маршрут.
    // replace — это опция, которая указывает, что вместо добавления новой записи в историю браузера, будет заменена текущая запись.
    // state — это опция, которая передает данные в виде объекта в URL.
    // reason — это ключ, который используется для передачи причины перенаправления.

    return (
      <Navigate
        to="/"
        replace
        state={{ from: location, reason: "auth_required" }}
      />
    );
  }

  // Если все проверки пройдены - показываем защищенный контент
  return children;
}

function RoomPageWithHeader() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Открытие модального окна при нажатии на шестеренку

  const { roomId } = useParams();
  const { roomData, isLoading, error, refetch } = useRoomData(roomId);

  // Оптимизируем функцию с помощью useCallback
  const handleSettingsClick = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  // Оптимизируем функцию закрытия настроек
  const handleSettingsClose = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  return (
    <>
      <RoomHeader
        onSettingsClick={handleSettingsClick}
        roomName={roomData?.roomName}
      />
      <RoomPage
        isSettingsModalOpen={isSettingsModalOpen}
        onSettingsClose={handleSettingsClose}
        roomData={roomData}
        refetchRoomData={refetch}
      />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="layout-container">
          <HeaderSelector />
          <main className="main-content">
            <Routes>
              <Route path="/rooms" element={<GetRooms />} />
              <Route
                path="/create-room"
                element={
                  <ProtectedRoute
                    allowGuest={true}
                    checkLogoutTimestamp={false}
                  >
                    <CreateRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room/:roomId"
                element={
                  <ProtectedRoute
                    allowGuest={true}
                    checkLogoutTimestamp={false}
                  >
                    <RoomPageWithHeader />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowGuest={false}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}
