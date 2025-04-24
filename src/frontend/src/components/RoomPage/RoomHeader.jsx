import { useNavigate } from "react-router-dom";
import gearIcon from "../../assets/gear-icon.png";
import userIcon from "../../assets/user-icon.png";
import BaseHeader from "../Header/BaseHeader";
import "./RoomHeader.css";

export default function RoomHeader({
  onSettingsClick,
  roomName,
  onLeaveRoom,
  canControlVideo,
}) {
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

        <div className="user-profile">
          <img
            src={userIcon}
            alt="Профиль пользователя"
            className="user-icon"
          />
        </div>
      </div>
    </BaseHeader>
  );
}
