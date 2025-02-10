import { useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useRoom } from "./RoomContext";
import { useState } from "react";
import axios from "axios";

export default function RoomPage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [roomName, setRoomName] = useState("Название комнаты");
  const [roomDescription, setRoomDescription] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const mouseDownOnContentRef = useRef(false);

  const { roomId } = useParams();
  const { setRoomData } = useRoom();

  // Загрузка данных комнаты
  useEffect(() => {
    // Создаем функцию для загрузки данных
    const fetchRoomData = async () => {
      try {
        const response = await axios.get(`/api/Rooms/${roomId}`);
        console.log("GET запрос к /api/Rooms/{roomId}: ", response.data);
        const roomData = response.data.room;
        setRoomData(roomData);

        // Обновляем локальные состояния данными с сервера
        setRoomName(roomData.roomName);
        setRoomDescription(roomData.description);
        setInviteLink(roomData.invitationLink);

        // console.log("roomName: ", roomData.roomName);
        // console.log("description: ", roomData.description);
        // console.log("invitationLink: ", roomData.invitationLink);
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };

    fetchRoomData();

    return () => setRoomData(null);
  }, [roomId, setRoomData]);

  // Обработчик копирования ссылки
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования:", err);
    }
  };

  // Закрытие модалок при клике на фон
  const handleCloseModal = (e) => {
    if (e.target === e.currentTarget && !mouseDownOnContentRef.current) {
      setIsInviteModalOpen(false);
      setIsSettingsModalOpen(false);
    }
    mouseDownOnContentRef.current = false;
  };

  // Обработчик сохранения настроек
  const handleSaveSettings = () => {
    // Здесь можно добавить логику сохранения
    setIsSettingsModalOpen(false);
  };

  return (
    <main className="main-content2">
      {/* Левая колонка: Видео-плеер */}
      <section className="video-section">
        <div id="video-player">
          {/* Здесь будет интеграция YouTube плеера */}
        </div>
        <button id="add-video-btn" className="btn">
          +
        </button>
      </section>
      {/* Правая колонка: Чат */}
      <section className="chat-section">
        {/* Ссылка-приглашение */}
        <button
          className="btn"
          id="invite-btn"
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite
        </button>

        {/* Модалка приглашения */}
        {isInviteModalOpen && (
          <div
            className="modal"
            id="modal"
            onClick={handleCloseModal}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                mouseDownOnContentRef.current = false;
              }
            }}
          >
            <div
              className="modal-content"
              onMouseDown={() => {
                mouseDownOnContentRef.current = true;
              }}
            >
              <h2>Invite Link</h2>
              <div className="link-container">
                <span id="inviteLink">{inviteLink}</span>
                <button id="copy-btn" onClick={handleCopy}>
                  Copy
                </button>
              </div>
              {showNotification && (
                <div id="notification" className="notification">
                  Copied to clipboard!
                </div>
              )}
            </div>
          </div>
        )}

        <div id="chat-messages">{/* Сообщения чата */}</div>

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

        {/* Модалка настроек комнаты, при нажатии на шестеренку */}
        {isSettingsModalOpen && (
          <div
            className="modal"
            id="settings-modal"
            onClick={handleCloseModal}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                mouseDownOnContentRef.current = false;
              }
            }}
          >
            <div
              className="modal-content"
              onMouseDown={() => {
                mouseDownOnContentRef.current = true;
              }}
            >
              <h2>Настройки комнаты</h2>
              <div className="form-group">
                <label htmlFor="room-name-input">Название комнаты:</label>
                <input
                  id="room-name-input"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="room-description-input">Описание:</label>
                <textarea
                  id="room-description-input"
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                />
              </div>
              <div className="modal-buttons">
                <button
                  className="btn"
                  id="save-settings-btn"
                  onClick={handleSaveSettings}
                >
                  Сохранить
                </button>
                <button
                  className="btn"
                  id="cancel-settings-btn"
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Кнопка открытия настроек (добавьте в разметку) */}
        <button
          id="gear-icon"
          className="btn"
          onClick={() => setIsSettingsModalOpen(true)}
        >
          ⚙️
        </button>
      </section>
    </main>
  );
}
