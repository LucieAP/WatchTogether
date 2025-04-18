import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPublicRooms } from "../../api/rooms";
import "./HomePage.css"; // Импортируем файл стилей

const HomePage = () => {
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка публичных комнат при монтировании компонента
  useEffect(() => {
    const fetchPublicRooms = async () => {
      try {
        setLoading(true);
        const response = await getPublicRooms();
        console.log("Public rooms:", response);
        setPublicRooms(response);
      } catch (err) {
        console.error("Ошибка при загрузке публичных комнат:", err);
        setError("Не удалось загрузить публичные комнаты. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicRooms();
  }, []);

  // Обработчик перенаправления на страницу с формой создания комнаты
  const handleCreateRoom = () => {
    navigate("/create-room");
  };

  // Обработчик перехода в комнату
  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="homePageContainer">
      <div className="homePage">
        <h1 className="title">Watch Together</h1>
        <p className="description">Смотрите видео вместе с друзьями в реальном времени</p>
        
        <button onClick={handleCreateRoom} className="createRoomButton">
          Создать комнату
        </button>

        <div className="publicRoomsSection">
          <h2>Публичные комнаты</h2>
          
          {loading ? (
            <p className="loading">Загрузка комнат...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : publicRooms.length === 0 ? (
            <p>Публичных комнат пока нет. Создайте первую!</p>
          ) : (
            <div className="roomsGrid">
              {publicRooms.map(room => (
                <div key={room.roomId} className="roomCard" onClick={() => handleJoinRoom(room.roomId)}>
                  <h3>{room.roomName}</h3>
                  <p className="roomDescription">{room.description}</p>
                  <div className="roomCardFooter">
                    <span className="participantsCount">
                      <i className="icon-user"></i> {room.participantsCount}
                    </span>
                    {room.currentVideoTitle && (
                      <p className="currentVideo">Сейчас: {room.currentVideoTitle}</p>
                    )}
                    <span className="roomCreator">Создатель: {room.createdByUsername}</span>
                    <span className="roomDate">Создана: {formatDate(room.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
