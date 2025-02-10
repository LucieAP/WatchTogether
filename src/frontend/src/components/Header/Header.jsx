import { useNavigate } from "react-router";
import gearIcon from "../../assets/gear-icon.png";

export default function Header() {
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
        {/* <h1 className="room-title">{roomData.title}</h1> */}
        <h1 className="room-title"></h1>
        <img src={gearIcon} alt="Настройки" className="gear-icon" />
      </div>

      <div className="user-profile">
        <img src="~/images/user-icon.png" alt="Профиль пользователя" />
      </div>
    </header>
  );
}
