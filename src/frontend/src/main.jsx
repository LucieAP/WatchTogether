import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./mystyle.css";
import "./components/CreateRoom/CreateRoom.css";
import "./components/Header/Header.css";
import "./components/Footer/Footer.css";
import "./components/NotFoundPage/NotFoundPage.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
