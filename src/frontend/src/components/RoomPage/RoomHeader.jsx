import { useNavigate, useParams } from "react-router-dom";
import { useRoomData } from "../../hooks/useRoomData"; // Хук для получения данных комнаты
import gearIcon from "../../assets/gear-icon.png";

export default function RoomHeader({ onSettingsClick }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const { roomData, isLoading, error } = useRoomData(roomId);

  //   if (isLoading) return <div>Loading room data...</div>;
  //   if (error) return <div>Error: {error}</div>;
  //   if (!roomData?.room) return <div>Room not found!</div>; // Добавьте эту проверку

  // console.log("roomData", roomData);

  const HandleHomePage = () => {
    navigate("/");
  };

  return (
    <header className="header">
      <div className="logo" onClick={HandleHomePage}>
        WatchTogether
      </div>

      <div className="room-info">
        <h1 className="room-title">{roomData?.room?.roomName}</h1>
        <img
          src={gearIcon}
          alt="Настройки"
          className="gear-icon"
          onClick={onSettingsClick}
        />
      </div>

      <div className="user-profile">
        <img src="~/images/user-icon.png" alt="Профиль пользователя" />
      </div>
    </header>
  );
}
