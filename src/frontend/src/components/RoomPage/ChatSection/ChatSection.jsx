import { InviteModal } from "../Modals/InviteModal";
import { LeaveRoomModal } from "../Modals/LeaveRoomModal";
import { formatMessageTime } from "../utils/chatHelpers";
import { useState, useEffect } from "react";
import "./ChatSection.css";
export const ChatSection = ({
  roomId,
  roomData,
  userInfo,
  messages,
  connectionRef,
  connectionStatus,
  isInviteModalOpen,
  setIsInviteModalOpen,
  mouseDownOnContentRef,
  messagesEndRef,
  handleManualReconnect,
  handleCloseModal,
  handleManualLeave,
  navigate,
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const [isLeaveRoomModalOpen, setIsLeaveRoomModalOpen] = useState(false);
  const openLeaveRoomModal = () => setIsLeaveRoomModalOpen(true);
  const closeLeaveRoomModal = () => setIsLeaveRoomModalOpen(false);

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

  // Обработчик отправки сообщения
  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const message = input.value.trim(); // возвращает строку с вырезанными пробельными символами с её концов

    if (message && userInfo) {
      try {
        await connectionRef.current.sendMessage(
          roomId,
          userInfo.userId,
          userInfo.username,
          message
        );
        input.value = "";
        input.focus();
      } catch (error) {
        console.error("Ошибка при отправке сообщения:", error);
      }
    }
  };

  // Функция-обработчик кнопки "Выйти из комнаты"
  const handleLeaveRoom = () => {
    handleManualLeave(roomId, connectionRef, navigate);
  };

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <section className="chat-section">
      <div className="chat-toolbar">
        {/* Ссылка-приглашение */}
        <button
          className="invite-btn"
          onClick={() => setIsInviteModalOpen(true)}
        >
          Пригласить
        </button>

        {/* Список участников */}
        <div className="participants-container">
          <div
            className="participants-header"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            Участники ({roomData?.participants?.length || 0})
            <span className="toggle-participants">
              {showParticipants ? "▲" : "▼"}
            </span>
          </div>

          {showParticipants && (
            <ul className="participants-list">
              {roomData?.participants?.map((participant) => (
                <li
                  key={participant.userId}
                  className={
                    participant.userId === userInfo?.userId
                      ? "current-user"
                      : ""
                  }
                >
                  {participant.username}
                  {participant.userId === userInfo?.userId && " (вы)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Модалка приглашения */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={handleCloseModal}
        onCopy={handleCopy}
        showNotification={showNotification}
        invitationLink={roomData?.invitationLink}
        mouseDownOnContentRef={mouseDownOnContentRef}
      />

      {/* Выход из комнаты */}
      <div className="leave-room-container">
        {/* Кнопка, которая открывает модальное окно */}

        <button onClick={openLeaveRoomModal} className="leave-button">
          Покинуть комнату
        </button>

        {/* Модальное окно подтверждения */}
        <LeaveRoomModal
          isOpen={isLeaveRoomModalOpen}
          onClose={closeLeaveRoomModal}
          onLeave={handleLeaveRoom}
        />
      </div>

      {/* Отображение состояния соединения */}
      <div className={`connection-status ${connectionStatus}`}>
        {connectionStatus === "connected" && <span>✓ Подключено</span>}
        {connectionStatus === "reconnecting" && (
          <span>⟳ Переподключение...</span>
        )}
        {connectionStatus === "disconnected" && (
          <div>
            <span>✕ Соединение потеряно</span>
            <button onClick={handleManualReconnect}>Переподключиться</button>
          </div>
        )}
        {connectionStatus === "error" && (
          <div>
            <span>✕ Ошибка соединения</span>
            <button onClick={handleManualReconnect}>Попробовать снова</button>
          </div>
        )}
      </div>

      <div className="messages-container">
        {/* Сообщения чата */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.isSystem ? "system-message" : ""} ${
              msg.userId === userInfo?.userId ? "own-message" : ""
            }`}
          >
            <div className="message-header">
              <span className="message-username">
                <strong>{msg.userName}:</strong>
              </span>
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

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          name="chatInput"
          placeholder="Введите сообщение..."
          autoComplete="off" // отключить автозаполнение (логины, пароли и т.д.)
        />
        <button type="submit" className="btn">
          Отправить
        </button>
      </form>
    </section>
  );
};
