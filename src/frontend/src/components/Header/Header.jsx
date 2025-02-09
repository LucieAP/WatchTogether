import { useNavigate, useLocation } from "react-router";
import { useRoom } from "../RoomPage/RoomContext";

export default function Header() {
  const { roomData } = useRoom();
  const navigate = useNavigate();
  const location = useLocation(); // Добавлено получение location

  const HandleHomePage = () => {
    navigate("/");
  };

  return (
    <header className="header">
      <div className="logo" onClick={HandleHomePage}>
        WatchTogether
      </div>

      {location.pathname.startsWith("/room/") && roomData && (
        <div className="room-info">
          <h1 className="room-title">{roomData.title}</h1>
          <img
            src="/assets/gear-icon.png"
            alt="Настройки"
            className="gear-icon"
          />
        </div>
      )}

      <div className="user-profile">
        <img src="~/images/user-icon.png" alt="Профиль пользователя" />
      </div>
    </header>
  );
}
