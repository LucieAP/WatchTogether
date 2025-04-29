import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import gearIcon from "../../assets/gear-icon.png";
import userIcon from "../../assets/user-icon.png";
import BaseHeader from "../Header/BaseHeader";
import { LeaveRoomModal } from "./Modals/LeaveRoomModal";
import "./RoomHeader.css";
import { handleManualLeave } from "../../api/leaveRoomAction";
import { calculateTimeLeft } from "../RoomPage/utils/roomHeaderHelpers";
import { useConnection } from "../../context/ConnectionContext";
import ConnectionStatus from "../shared/ConnectionStatus";
import ConnectionIndicator from "../shared/ConnectionIndicator";
export default function RoomHeader({
  onSettingsClick,
  roomName,
  canControlVideo,
  roomId,
  expiresAt,
}) {
  const navigate = useNavigate();
  const [isLeaveRoomModalOpen, setIsLeaveRoomModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const openLeaveRoomModal = () => setIsLeaveRoomModalOpen(true);
  const closeLeaveRoomModal = () => setIsLeaveRoomModalOpen(false);

  // Используем контекст состояния соединения
  const { connectionRef, connectionStatus } = useConnection();

  const handleLeaveRoom = () => {
    handleManualLeave(roomId, connectionRef, navigate);
    closeLeaveRoomModal();
  };

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null); // Сбрасываем время, если expiresAt удалили
      return;
    }

    console.log("expiresAt:", expiresAt);

    // Рассчитываем начальное значение
    const updateTimeLeft = () => {
      const result = calculateTimeLeft(expiresAt);

      // Защита от отрицательного времени
      if (result.timeLeft <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft(result.timeLeft);
      setShowWarning(result.showWarning);
    };

    updateTimeLeft();

    // Обновляем таймер каждую секунду
    const timerId = setInterval(updateTimeLeft, 1000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(timerId);
  }, [expiresAt]);

  return (
    <BaseHeader hideServerStatus={true}>
      {/* Специфичный для комнаты контент, который будет вставлен между логотипом и авторизацией */}
      <div className="room-header-content">
        <div className="room-info">
          <h1 className="room-title">{roomName}</h1>
          {/* Отображаем кнопку настроек только если пользователь может управлять видео */}
          {canControlVideo && (
            <img
              src={gearIcon}
              alt="Настройки"
              className="gear-icon"
              onClick={onSettingsClick}
              title="Настройки комнаты"
            />
          )}

          {/* Отображение времени до закрытия комнаты */}
          {timeLeft && (
            <div className={`room-expiration ${showWarning ? "warning" : ""}`}>
              <div className="expiration-time">
                Время до закрытия: {timeLeft}
              </div>
              {showWarning && (
                <div className="expiration-warning">
                  Комната закроется через &lt;5 мин!
                </div>
              )}
            </div>
          )}
        </div>

        <div className="right-controls">
          {/* Отображение состояния соединения */}
          <ConnectionStatus
            className="chat-connection-status"
            showText={false}
          />

          <ConnectionIndicator />

          {/* Выход из комнаты */}
          <div className="leave-room-header">
            <button onClick={openLeaveRoomModal} className="leave-button">
              Покинуть комнату
            </button>

            <LeaveRoomModal
              isOpen={isLeaveRoomModalOpen}
              onClose={closeLeaveRoomModal}
              onLeave={handleLeaveRoom}
            />
          </div>
        </div>
      </div>
    </BaseHeader>
  );
}
