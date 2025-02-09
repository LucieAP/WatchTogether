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
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RoomProvider } from "./components/RoomPage/RoomContext";

export default function App() {
  return (
    <RoomProvider>
      <Router>
        <div className="layout-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:roomId" element={<RoomPage />} />
              <Route
                // path="/api/Rooms/Create"
                path="/create-room" // http://localhost:5173/create-room
                element={<CreateRoom />}
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </RoomProvider>
  );
}
