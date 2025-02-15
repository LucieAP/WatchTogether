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

// Регулярное выражение для извлечения YouTube video ID
const YOUTUBE_REGEX =
  /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;

export default function RoomPage({
  isSettingsModalOpen,
  onSettingsClose,
  roomData: initialRoomData,
  refetchRoomData,
}) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  // Отслеживаем взаимодействие с мышью, чтобы решить проблему закрытия модального окна при копировании текста и выходе курсора за его границы
  const mouseDownOnContentRef = useRef(false);

  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
  });
  const connectionRef = useRef(null);

  // Объединяем данные комнаты в одно состояние
  const [roomData, setRoomData] = useState({
    roomName: "Название комнаты",
    description: "",
    invitationLink: "",
    participants: [],
    ...initialRoomData, // Добавляем начальные значения
  });

  // Синхронизируем только при изменении initialRoomData
  useEffect(() => {
    if (initialRoomData) {
      setRoomData((prev) => ({
        ...prev,
        roomName: initialRoomData.room.roomName || "",
        description: initialRoomData.room.description || "",
        invitationLink: initialRoomData.room.invitationLink || "",
      }));
    }
  }, [initialRoomData]);

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

      // Получаем обновленные данные с сервера
      const updatedRoomResponse = await getRoom(roomId);

      setRoomData((prev) => ({
        ...prev,
        roomName: response.newRoomName,
        description: response.newRoomName,
      }));

      console.log("Обновленные данные:", {
        name: response.newRoomName,
        desc: response.newDescription,
      });

      // Принудительно обновляем данные
      await refetchRoomData();

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

        console.log("Join response data:", joinResponse.data);
        console.log("userInfo 1", userInfo);
        setUserInfo({
          userId: joinResponse.data.userId,
          username: joinResponse.data.username,
        });

        console.log("userInfo 2", userInfo);

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
    console.log(message);
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
        userInfo.userId,
        userInfo.username,
        message
      );
      input.value = "";
    }
  };

  // Обработчик добавления видео
  const handleAddVideo = async () => {
    const match = videoUrl.match(YOUTUBE_REGEX);
    if (match && match[2].length === 11) {
      const videoId = match[2];

      try {
        // // Обновляем видео в комнате на бэкенде
        // await axios.post(`/api/rooms/${roomId}/video`, { videoId });
        // // Обновляем состояние и инициализируем плеер
        // setRoomData(prev => ({ ...prev, currentVideoId: videoId }));
        // initializePlayer(videoId);
        // setIsAddVideoModalOpen(false);
        // setVideoUrl("");
      } catch (error) {
        console.error("Ошибка при обновлении видео:", error);
      }
    } else {
      alert("Пожалуйста, введите корректную ссылку YouTube");
    }
  };

  return (
    <main className="main-content2">
      {/* Левая колонка: Видео-плеер */}
      <section className="video-section">
        <div id="video-player">
          {/* Здесь будет интеграция YouTube плеера */}
        </div>
        <button
          id="add-video-btn"
          className="btn"
          onClick={() => setIsAddVideoModalOpen(true)}
        >
          +
        </button>

        {/* Модалка добавления видео */}
        {isAddVideoModalOpen && (
          <div
            className="modal"
            onClick={handleCloseModal}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                mouseDownOnContentRef.current = false;
              }
            }}
          >
            <div className="modal-content">
              <h2>Добавить видео</h2>
              <input
                type="text"
                placeholder="Вставьте ссылку YouTube"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <div
                className="modal-buttons"
                onMouseDown={() => {
                  mouseDownOnContentRef.current = true;
                }}
              >
                <button className="btn" onClick={handleAddVideo}>
                  Добавить
                </button>
                <button
                  className="btn"
                  onClick={() => setIsAddVideoModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
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
