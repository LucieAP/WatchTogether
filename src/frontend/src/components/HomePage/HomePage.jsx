import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css"; // Импортируем файл стилей

const HomePage = () => {
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    // Перенаправляем на страницу с формой создания комнаты
    navigate("/api/Rooms/Create");
  };

  return (
    <div className="homePageContainer">
      <button onClick={handleCreateRoom} className="createRoomButton">
        Создать комнату
      </button>
    </div>
  );
};

export default HomePage;
