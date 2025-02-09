import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useRoom } from "./RoomContext";

export default function RoomPage() {
  const { roomId } = useParams();
  const { setRoomData } = useRoom();
  // Загрузка данных комнаты через API
  useEffect(() => {
    fetch(`/api/Rooms/${roomId}`)
      .then((response) => response.json())
      .then((data) => setRoomData(data))
      .catch(console.error);

    return () => setRoomData(null); // Очистка при размонтировании
  }, [roomId, setRoomData]);
  return (
    <main className="main-content2">
      <section className="video-section">
        <div id="video-player"></div>

        <button id="add-video-btn" className="btn">
          +
        </button>
      </section>

      <section className="chat-section">
        <button id="invite-btn" className="btn">
          Invite
        </button>

        <div className="modal" id="modal">
          <div className="modal-content">
            <h2>Invite Link</h2>
            <div className="link-container">
              <span id="inviteLink"></span>
              <button id="copy-btn">Copy</button>
            </div>
            <div id="notification" className="notification">
              Copied to clipboard!
            </div>
          </div>
        </div>

        <div id="chat-messages"></div>

        <form id="chat-form">
          <input
            type="text"
            id="chat-input"
            placeholder="Введите сообщение..."
          />
          <button type="submit" className="btn">
            Отправить
          </button>
        </form>
      </section>

      <div className="modal" id="settings-modal">
        <div className="modal-content">
          <h2>Настройки комнаты</h2>
          <div className="form-group">
            <label htmlFor="room-name-input">Название комнаты:</label>
            <input type="text" id="room-name-input" />
          </div>
          <div className="form-group">
            <label htmlFor="room-description-input">Описание:</label>
            <textarea id="room-description-input"></textarea>
          </div>
          <div className="modal-buttons">
            <button id="save-settings-btn" className="btn">
              Сохранить
            </button>
            <button id="cancel-settings-btn" className="btn">
              Отмена
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
