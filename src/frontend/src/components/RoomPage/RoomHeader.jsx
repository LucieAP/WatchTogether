import { useNavigate } from "react-router-dom";
import gearIcon from "../../assets/gear-icon.png";
import userIcon from "../../assets/user-icon.png";
import BaseHeader from "../Header/BaseHeader";
import { LeaveRoomModal } from "./Modals/LeaveRoomModal";
import { useState, useEffect } from "react";
import "./RoomHeader.css";
import { handleManualLeave } from "../../api/leaveRoomAction";

export default function RoomHeader({
  onSettingsClick,
  roomName,
  canControlVideo,
  roomId,
  connectionRef,
  expiresAt,
}) {
  const navigate = useNavigate();
  const [isLeaveRoomModalOpen, setIsLeaveRoomModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const openLeaveRoomModal = () => setIsLeaveRoomModalOpen(true);
  const closeLeaveRoomModal = () => setIsLeaveRoomModalOpen(false);

  const handleLeaveRoom = () => {
    handleManualLeave(roomId, connectionRef, navigate);
    closeLeaveRoomModal();
  };

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const expirationTime = new Date(expiresAt);
      const now = new Date();
      const difference = expirationTime - now;

      // Если время истекло, устанавливаем таймер в 0
      if (difference <= 0) {
        setTimeLeft("00:00:00");
        setShowWarning(false);
        return;
      }

      // Расчет оставшегося времени
      const hours = Math.floor(difference / (1000 * 60 * 60))
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        .toString()
        .padStart(2, "0");

      setTimeLeft(`${hours}:${minutes}:${seconds}`);

      // Показываем предупреждение, если осталось меньше 5 минут
      setShowWarning(difference <= 5 * 60 * 1000);
    };

    // Рассчитываем начальное значение
    calculateTimeLeft();

    // Обновляем таймер каждую секунду
    const timerId = setInterval(calculateTimeLeft, 1000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(timerId);
  }, [expiresAt]);

  return (
    <BaseHeader>
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
        </div>

        {/* Отображение времени до закрытия комнаты */}
        {timeLeft && (
          <div className={`room-expiration ${showWarning ? "warning" : ""}`}>
            {showWarning && (
              <div className="expiration-warning">
                Внимание! Комната будет закрыта менее чем через 5 минут.
              </div>
            )}
            <div className="expiration-time">
              Время до закрытия комнаты: {timeLeft}
            </div>
          </div>
        )}

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
    </BaseHeader>
  );
}
