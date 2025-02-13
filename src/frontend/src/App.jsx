import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import CreateRoom from "./components/CreateRoom/CreateRoom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
import HomePage from "./components/HomePage/HomePage";
import RoomPage from "./components/RoomPage/RoomPage";
import RoomHeader from "./components/RoomPage/RoomHeader";
import GetRooms from "./components/GetRooms";
import { matchPath } from "react-router";
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

  return (
    <>
      <RoomHeader onSettingsClick={() => setIsSettingsModalOpen(true)} />
      <RoomPage
        isSettingsModalOpen={isSettingsModalOpen}
        onSettingsClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="layout-container">
        <HeaderSelector />
        <main className="main-content">
          <Routes>
            <Route path="/rooms" element={<GetRooms />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/room/:roomId" element={<RoomPageWithHeader />} />
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
