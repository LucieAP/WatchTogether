import { useNavigate } from "react-router-dom";
import gearIcon from "../../assets/gear-icon.png";
import userIcon from "../../assets/user-icon.png";
import BaseHeader from "../Header/BaseHeader";
import { LeaveRoomModal } from "./Modals/LeaveRoomModal";
import { useState } from "react";
import "./RoomHeader.css";
import { handleManualLeave } from "../../api/leaveRoomAction";

export default function RoomHeader({
  onSettingsClick,
  roomName,
  canControlVideo,
  roomId,
  connectionRef,
}) {
  const navigate = useNavigate();
  const [isLeaveRoomModalOpen, setIsLeaveRoomModalOpen] = useState(false);

  const openLeaveRoomModal = () => setIsLeaveRoomModalOpen(true);
  const closeLeaveRoomModal = () => setIsLeaveRoomModalOpen(false);

  const handleLeaveRoom = () => {
    handleManualLeave(roomId, connectionRef, navigate);
    closeLeaveRoomModal();
  };

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
