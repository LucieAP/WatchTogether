import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./NotFoundPage.css";

const NotFoundPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Проверяем, содержит ли URL слово "room", чтобы определить, пришёл ли пользователь со страницы комнаты
  const isFromRoomPage = location.pathname.includes("room");

  // Обработчик возврата на главную страницу
  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="not-found-container">
      <h1 className="not-found-number">404</h1>
      {isFromRoomPage ? (
        <p className="not-found-text">Комната не найдена или была удалена</p>
      ) : (
        <p className="not-found-text">Страница не найдена</p>
      )}
      <button onClick={handleGoHome} className="go-home-button">
        Вернуться на главную
      </button>
    </div>
  );
};

export default NotFoundPage;
