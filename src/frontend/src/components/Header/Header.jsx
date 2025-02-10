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

      <div className="user-profile">
        <img src="~/images/user-icon.png" alt="Профиль пользователя" />
      </div>
    </header>
  );
}
