import { useNavigate, useParams } from "react-router-dom";
import gearIcon from "../../assets/gear-icon.png";

export default function RoomHeader({ onSettingsClick, roomName, onLeaveRoom }) {
  const navigate = useNavigate();

  const HandleHomePage = () => {
    navigate("/");
  };

  return (
    <header className="header">
      <div className="logo" onClick={HandleHomePage}>
        WatchTogether
      </div>

      <div className="room-info">
        <h1 className="room-title">{roomName}</h1>
        <img
          src={gearIcon}
          alt="Настройки"
          className="gear-icon"
          onClick={onSettingsClick}
        />
      </div>

      {/* Кнопка выхода из комнаты, использующая переданную функцию */}
      {onLeaveRoom && (
        <button onClick={onLeaveRoom} className="leave-button">
          Выйти из комнаты
        </button>
      )}

      <div className="user-profile">
        <img src="~/images/user-icon.png" alt="Профиль пользователя" />
      </div>
    </header>
  );
}
