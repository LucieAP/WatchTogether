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
import { AuthProvider } from "./context/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

function HeaderSelector() {
  const location = useLocation();
  const isRoomPage = matchPath({ path: "/room/:roomId" }, location.pathname); // Соответствует ли заданный URL текущему адресу

  return isRoomPage ? null : <Header />;
}

function RoomPageWithHeader() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Открытие модального окна при нажатии на шестеренку

  const { roomId } = useParams();
  const { roomData, isLoading, error, refetch } = useRoomData(roomId);

  // const [leaveRoomFunction, setLeaveRoomFunction] = useState(null); // Состояние для хранения функции выхода

  // // Функция для получения метода onLeaveRoom из RoomPage
  // const handleLeaveRoomFunction = (leaveFunc) => {
  //   setLeaveRoomFunction(leaveFunc);
  // };

  return (
    <>
      <RoomHeader
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        roomName={roomData?.roomName}
        //onLeaveRoom={leaveRoomFunction} // Передаем функцию в RoomHeader
      />
      <RoomPage
        isSettingsModalOpen={isSettingsModalOpen}
        onSettingsClose={() => setIsSettingsModalOpen(false)}
        roomData={roomData}
        refetchRoomData={refetch}
        //onLeaveRoomHandler={handleLeaveRoomFunction} // Передаем колбэк в RoomPage
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
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/room/:roomId" element={<RoomPageWithHeader />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}
