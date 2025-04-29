import React from "react";
import { useConnection } from "../../context/ConnectionContext";
import "./ConnectionIndicator.css";

/**
 * Компонент индикатора состояния соединения для отображения в хедере
 */
const ConnectionIndicator = () => {
  const { connectionStatus } = useConnection();

  // Определяем класс и текст в зависимости от статуса
  let statusClass = "";
  let statusText = "";

  switch (connectionStatus) {
    case "connected":
      statusClass = "connected";
      statusText = "Соединение активно";
      break;
    case "reconnecting":
      statusClass = "reconnecting";
      statusText = "Переподключение...";
      break;
    case "disconnected":
      statusClass = "disconnected";
      statusText = "Соединение потеряно";
      break;
    case "error":
      statusClass = "error";
      statusText = "Ошибка соединения";
      break;
    default:
      statusClass = "disconnected";
      statusText = "Нет соединения";
  }

  // Показываем индикатор только если есть проблемы с соединением
  if (connectionStatus === "connected") {
    return null;
  }

  return (
    <div className={`connection-indicator ${statusClass}`} title={statusText}>
      <span className="connection-indicator__dot"></span>
      <span className="connection-indicator__text">{statusText}</span>
    </div>
  );
};

export default ConnectionIndicator;
