import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { updateRoom } from "../../api/rooms";
import { getRoom } from "../../api/rooms";
import { createConnection } from "../../api/chat";
import axios from "axios";
import VideoPlayer from "../VideoPlayer/VideoPlayer";
import { useDebouncedCallback } from "use-debounce";
import { AddVideoModal } from "../AddVideoModal";

// Парамтеры для текста
const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

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

  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
  });
  const connectionRef = useRef(null);
  const messagesEndRef = useRef(null); // Ref для автопрокрутки чата

  // Объединяем данные комнаты в одно состояние
  const [roomData, setRoomData] = useState({
    roomName: "Название комнаты",
    description: "",
    invitationLink: "",
    participants: [],
    currentVideoId: null,
    currentVideo: [],
    isPaused: true,
    currentTime: 0,

    ...initialRoomData, // Добавляем начальные значения
  });

  console.log("roomData RoomPage: ", roomData);

  /* Работа с видео */

  /* Регулярное выражение для всех форматов YouTube
  https://youtube.com/watch?v=ID
  https://www.youtube.com/watch?v=ID
  https://youtu.be/ID
  youtube.com/shorts/ID
  */
  const YOUTUBE_REGEX =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [tempMetadata, setTempMetadata] = useState({ title: "", duration: 0 });

  // Обработчик добавления видео
  const handleAddVideoModal = async () => {
    const match = videoUrl.match(YOUTUBE_REGEX);
    if (match && match[1].length === 11) {
      const videoId = match[1]; // id видео ютуба (11 цифр)

      try {
        // Используем данные из tempMetadata
        const { title, duration } = tempMetadata;

        console.log("videoId: ", videoId);
        console.log("duration: ", duration);
        console.log("title: ", title);

        // Обновляем видео в комнате на бэкенде
        const response = await axios.put(`/api/Rooms/${roomId}/video`, {
          videoId: match[1],
          title,
          duration,
        });

        console.log("Update Video and Room: ", response);

        // Обновляем состояние на основе ответа сервера
        setRoomData((prev) => ({
          ...prev,
          currentVideoId: videoId,
          currentVideo: { videoId: match[1], title, duration },
        }));

        setIsAddVideoModalOpen(false);
        setVideoUrl("");
        setTempMetadata({ title: "", duration: 0 }); // Сброс метаданных
      } catch (error) {
        console.error("Ошибка при обновлении видео:", error);
      }
    } else {
      alert("Пожалуйста, введите корректную ссылку YouTube");
    }
  };

  useEffect(() => {
    console.log("Текущее видео изменилось:", roomData);
  }, [roomData.currentVideoId]);

  // Сброс метаданных при закрытии модалки
  const closeAddVideoModal = () => {
    setIsAddVideoModalOpen(false);
    setVideoUrl("");
    setTempMetadata({ title: "", duration: 0 });
  };

  // Обработчик управления плеером
  const handlePlayPause = async (action) => {
    try {
      const response = await axios.patch(`/api/rooms/${roomId}/player`, {
        isPaused: action === "pause",
      });
      console.log("IsPaused: ", response.data.isPaused);
      console.log("response.data after Pause: ", response.data);
      setRoomData((prev) => ({ ...prev, isPaused: action === "pause" }));
    } catch (error) {
      console.error("Ошибка синхронизации:", error);
    }
  };

  const handleTimeUpdate = useDebouncedCallback(async (seconds) => {
    try {
      const response = await axios.patch(`/api/rooms/${roomId}/player`, {
        currentTimeInSeconds: Math.floor(seconds),
      });

      console.log("CurrentTime: ", response.data.currentTimeInSeconds);
      // console.log("response.data after CurrentTime: ", response.data);
    } catch (error) {
      console.error("Ошибка обновления времени:", error);
    }
  }, 1000);

  const handleCloseVideo = async () => {
    try {
      await axios.delete(`/api/Rooms/${roomId}/video`, { roomId });

      // Обновляем локальное состояние
      setRoomData((prev) => ({
        ...prev,
        currentVideoId: null,
        currentVideo: null,
      }));
    } catch (error) {
      console.error("Ошибка при удалении видео:", error);
    }
  };

  /* Конец работы с видео*/

  // Синхронизируем только при изменении initialRoomData
  useEffect(() => {
    if (initialRoomData) {
      setRoomData((prev) => ({
        ...prev,
        ...initialRoomData,
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
      setIsAddVideoModalOpen(false);
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
        // console.log("userInfo 1", userInfo);
        setUserInfo({
          userId: joinResponse.data.userId,
          username: joinResponse.data.username,
        });

        // console.log("userInfo 2", userInfo);

        // Подключаемся к SignalR
        const { connection, start, sendMessage, clearChatHistory } =
          createConnection(
            roomId,
            handleNewMessage,
            handleParticipantsUpdated,
            handleChatHistory,
            handleChatHistoryCleared,
            joinResponse.data.username,
            joinResponse.data.userId
          );

        connectionRef.current = { connection, sendMessage, clearChatHistory };
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

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Обработчик нового сообщения
  const handleNewMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        // // Генерируем уникальный ID для ключа в списке
        // id: Date.now() + Math.random().toString(36).substr(2),
        // Используем ID сообщения, если есть, или генерируем уникальный
        id:
          message.messageId ||
          Date.now() + Math.random().toString(36).substr(2),
      },
    ]);
    console.log(message);
  };

  // Обработчик получения истории чата
  const handleChatHistory = (history) => {
    // Преобразуем историю в формат, используемый в компоненте
    const formattedHistory = history.map((msg) => ({
      id: msg.messageId || msg.timestamp + Math.random().toString(36).substr(2),
      userId: msg.userId === "System" ? null : msg.userId,
      userName: msg.userName,
      message: msg.message,
      isSystem: msg.userId === "System",
      timestamp: new Date(msg.timestamp),
    }));

    setMessages(formattedHistory);
  };

  // Обработчик очистки истории чата
  const handleChatHistoryCleared = () => {
    setMessages([]);
  };

  // Обработчик обновления пользователей
  const handleParticipantsUpdated = async () => {
    try {
      const response = await axios.get(`/api/Rooms/${roomId}`);
      console.log("response: ", response);
      setRoomData((prev) => ({
        ...prev,
        participants: response.data.room.participants,
      }));
    } catch (error) {
      console.error("Error updating participants:", error);
    }
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

  // Функция для форматирования времени сообщения
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="main-content2">
      {/* Левая колонка: Видео-плеер */}
      <section className="video-section">
        {roomData?.currentVideo?.videoId ? (
          <>
            <VideoPlayer
              roomId={roomId}
              currentVideoId={roomData.currentVideo.videoId}
              playing={!roomData.isPaused}
              currentTime={roomData.currentTime}
              onVideoAdded={() => setIsAddVideoModalOpen(true)}
              onPlayPause={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
            />
            {/* Кнопка закрытия плеера */}
            <button
              id="close-video-btn"
              className="btn"
              onClick={handleCloseVideo}
            >
              Закрыть
            </button>
          </>
        ) : (
          <button
            id="add-video-btn"
            className="btn"
            onClick={() => setIsAddVideoModalOpen(true)}
          >
            +
          </button>
        )}
        {/* Модалка добавления видео */}
        {isAddVideoModalOpen && (
          <AddVideoModal
            videoUrl={videoUrl}
            tempMetadata={tempMetadata}
            onUrlChange={setVideoUrl}
            onMetadataChange={setTempMetadata}
            onClose={closeAddVideoModal}
            onSubmit={(videoId) => {
              handleAddVideoModal(videoId); // Обновляем текущее видео
            }}
          />
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
              {/*<strong>{msg.userName}:</strong> {msg.message}*/}
              <div className="message-header">
                <span className="message-username">{msg.userName}</span>
                {msg.timestamp && (
                  <span className="message-timestamp">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                )}
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Элемент для автопрокрутки */}
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
