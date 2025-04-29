import React from "react";
import { useConnection } from "../../context/ConnectionContext";

/**
 * Общий компонент для отображения статуса соединения SignalR
 * Компонент можно использовать в любом месте приложения
 */
export const ConnectionStatus = ({
  showText = true,
  className = "",
  customReconnect = null,
}) => {
  const { connectionStatus, handleManualReconnect } = useConnection();

  // Используем переданную функцию переподключения или функцию из контекста
  const onReconnect = customReconnect || handleManualReconnect;

  // Если соединение установлено и не нужно показывать статус соединения явно, не отображаем ничего
  if (connectionStatus === "connected" && !showText) {
    return null;
  }

  return (
    <div className={`connection-status ${connectionStatus} ${className}`}>
      {connectionStatus === "connected" && showText && (
        <span className="connection-status__text connection-status__text--connected">
          ✓ Подключено
        </span>
      )}

      {connectionStatus === "reconnecting" && (
        <span className="connection-status__text connection-status__text--reconnecting">
          ⟳ Переподключение...
        </span>
      )}

      {connectionStatus === "disconnected" && (
        <div className="connection-status__disconnected">
          <span className="connection-status__text connection-status__text--disconnected">
            ✕ Соединение потеряно
          </span>
          <button
            className="connection-status__reconnect-btn"
            onClick={onReconnect}
          >
            Переподключиться
          </button>
        </div>
      )}

      {connectionStatus === "error" && (
        <div className="connection-status__error">
          <span className="connection-status__text connection-status__text--error">
            ✕ Ошибка соединения
          </span>
          <button
            className="connection-status__reconnect-btn"
            onClick={onReconnect}
          >
            Попробовать снова
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
