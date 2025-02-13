import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { updateRoom } from "../../api/rooms";
import { getRoom } from "../../api/rooms";
import { createConnection } from "../../api/chat";
import axios from "axios";

const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

export default function RoomPage({ isSettingsModalOpen, onSettingsClose }) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  // Отслеживаем взаимодействие с мышью, чтобы решить проблему закрытия модального окна при копировании текста и выходе курсора за его границы
  const mouseDownOnContentRef = useRef(false);

  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const connectionRef = useRef(null);

  // Объединяем данные комнаты в одно состояние
  const [roomData, setRoomData] = useState({
    roomName: "Название комнаты",
    description: "",
    invitationLink: "",
    participants: [],
  });

  // Загрузка данных комнаты
  useEffect(() => {
    const controller = new AbortController(); // отмена запросов при размонтировании

    // Создаем функцию для загрузки данных
    const fetchRoomData = async () => {
      try {
        const response = await axios.get(`/api/Rooms/${roomId}`);
        console.log("GET запрос к /api/Rooms/{roomId}: ", response.data);

        setRoomData((prev) => ({
          ...prev,
          roomName: response.data.room.roomName || "Название комнаты",
          description: response.data.room.description || "",
          invitationLink: response.data.room.invitationLink || "",
          participants: response.data.room.participants || [],
        }));
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Ошибка загрузки данных:", error);
          // Показать уведомление пользователю
        }
      }
    };

    fetchRoomData();
    return () => controller.abort();
  }, [roomId]);

  // Обработчик копирования ссылки
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomData.invitationLink);
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
      onSettingsClose();
    }
    mouseDownOnContentRef.current = false;
  };

  // Обработка сохранения изменений при настройке комнаты
  const handleSaveSettings = async () => {
    try {
      const response = await updateRoom(roomId, {
        roomName: roomData.roomName,
        description: roomData.description,
      });

      // setRoomName(response.newRoomName);
      // setRoomDescription(response.newDescription);

      // Получаем обновленные данные с сервера
      const updatedRoomResponse = await getRoom(roomId);

      setRoomData((prev) => ({
        ...prev,
        roomName: response.newRoomName,
        description: response.newRoomName,
      }));

      console.log("updatedRoomResponse", updatedRoomResponse);

      console.log("Обновленные данные:", {
        name: response.newRoomName,
        desc: response.newDescription,
      });
      onSettingsClose();
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", {
        message: error.message,
        fullError: error, // Выводим полный объект ошибки
      });
      // Расширенная диагностика ошибок
      if (error.response) {
        console.error("Данные ответа сервера:", error.response.data);
        console.error("HTTP статус:", error.response.status);
      }
    }
  };

  // Загрузка данных комнаты и подключение к чату
  useEffect(() => {
    const setupChat = async () => {
      try {
        const joinResponse = await axios.post(`/api/Rooms/${roomId}/join`);

        // console.log("roomResponse", roomResponse);
        console.log("joinResponse", joinResponse);
        setUserInfo(joinResponse.data);

        // Подключаемся к SignalR
        const { connection, start, sendMessage } = createConnection(
          roomId,
          handleNewMessage,
          handleParticipantsUpdated
        );

        connectionRef.current = { connection, sendMessage };
        await start();
      } catch (error) {
        console.error("Chat setup error:", error);
      }
    };

    setupChat();

    return () => {
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop();
      }
    };
  }, [roomId]);

  // Обработчик нового сообщения
  const handleNewMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  // Обработчик обновления пользователей
  const handleParticipantsUpdated = async () => {
    const response = await axios.get(`/api/Rooms/${roomId}`);
    console.log("response: ", response);
    setRoomData((prev) => ({
      ...prev,
      participants: response.data.room.participants,
    }));
  };

  // Обработчик отправки сообщения
  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const message = input.value.trim(); // возвращает строку с вырезанными пробельными символами с её концов

    if (message && userInfo) {
      await connectionRef.current.sendMessage(
        roomId,
        userInfo.UserId,
        userInfo.Username,
        message
      );
      input.value = "";
    }
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
                <span id="inviteLink">{roomData?.invitationLink}</span>
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

        <div id="chat-messages">
          {/* Сообщения чата */}
          {messages.map((msg, index) => (
            <div key={index} className="message">
              <strong>{msg.userName}:</strong> {msg.message}
            </div>
          ))}
        </div>

        <form id="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            id="chat-input"
            name="chatInput"
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
                  value={roomData?.roomName}
                  {...INPUT_PROPS}
                  onChange={(e) =>
                    setRoomData((prev) => ({
                      ...prev,
                      roomName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="room-description-input">Описание:</label>
                <textarea
                  id="room-description-input"
                  value={roomData?.description}
                  {...INPUT_PROPS}
                  onChange={(e) =>
                    setRoomData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
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
                  onClick={onSettingsClose}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
