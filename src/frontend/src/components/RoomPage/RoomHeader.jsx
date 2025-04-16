import { useNavigate } from "react-router-dom";
import gearIcon from "../../assets/gear-icon.png";
import userIcon from "../../assets/user-icon.png";
import BaseHeader from "../Header/BaseHeader";
import "./RoomHeader.css";

export default function RoomHeader({ onSettingsClick, roomName, onLeaveRoom }) {
  return (
    <BaseHeader>
      {/* Специфичный для комнаты контент, который будет вставлен между логотипом и авторизацией */}
      <div className="room-header-content">
        <div className="room-info">
          <h1 className="room-title">{roomName}</h1>
          <img
            src={gearIcon}
            alt="Настройки"
            className="gear-icon"
            onClick={onSettingsClick}
          />
        </div>

        {/* Кнопка выхода из комнаты
        {onLeaveRoom && (
          <button onClick={onLeaveRoom} className="leave-button">
            Выйти из комнаты
          </button>
        )} */}
        
        <div className="user-profile">
          <img src={userIcon} alt="Профиль пользователя" className="user-icon"/>
        </div>
      </div>
    </BaseHeader>
  );
}
