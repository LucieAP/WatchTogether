import { useState } from "react";
import { matchPath, useParams } from "react-router";
import "./App.css";
import CreateRoom from "./components/CreateRoom/CreateRoom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
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

function HeaderSelector() {
  const location = useLocation();
  const isRoomPage = matchPath({ path: "/room/:roomId" }, location.pathname); // Соответствует ли заданный URL текущему адресу

  return isRoomPage ? null : <Header />;
}

// Компонент для защиты маршрутов, требующих авторизации
function ProtectedRoute({ children, allowGuest = true }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation(); // Получаем текущий URL
  
  // Получаем время последнего выхода из системы
  const logoutTimestamp = sessionStorage.getItem('logout_timestamp');
  
  console.log("isLoggedIn", isLoggedIn);
  console.log("allowGuest", allowGuest);
  console.log("logoutTimestamp", logoutTimestamp);
    
  // Перенаправляем на главную страницу в двух случаях:
  // 1. Если пользователь не авторизован (isLoggedIn = false) и гостевой доступ не разрешен (allowGuest = false)
  // 2. Если есть метка о недавнем выходе из системы (logoutTimestamp существует) и гостевой доступ не разрешен
  if ((!isLoggedIn && !allowGuest) || (logoutTimestamp && !allowGuest)) {
    // Если существует метка времени выхода и пользователь пытается перейти на защищенный маршрут,
    // перенаправляем на главную страницу
    return <Navigate to="/" replace state={{ from: location, reason: "auth_required" }} />;
  }
  
  return children;
}

function RoomPageWithHeader() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Открытие модального окна при нажатии на шестеренку

  const { roomId } = useParams();
  const { roomData, isLoading, error, refetch } = useRoomData(roomId);

  return (
    <>
      <RoomHeader
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        roomName={roomData?.roomName}
      />
      <RoomPage
        isSettingsModalOpen={isSettingsModalOpen}
        onSettingsClose={() => setIsSettingsModalOpen(false)}
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
              <Route path="/create-room" element={
                <ProtectedRoute allowGuest={true}>
                  <CreateRoom />
                </ProtectedRoute>
              } />
              <Route path="/room/:roomId" element={
                <ProtectedRoute allowGuest={true}>
                  <RoomPageWithHeader />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={
                <ProtectedRoute allowGuest={false}>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}
