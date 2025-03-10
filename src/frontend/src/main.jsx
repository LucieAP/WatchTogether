import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./mystyle.css";
import "./components/CreateRoom/CreateRoom.css";
import "./components/Header/Header.css";
import "./components/Footer/Footer.css";
import "./components/NotFoundPage/NotFoundPage.css";
import "./components/HomePage/HomePage.css";
import "./components/RoomPage/RoomPage.css";
import "./components/VideoPlayer/VideoPlayer.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  // <StrictMode>
  <App />
  // </StrictMode>
);
