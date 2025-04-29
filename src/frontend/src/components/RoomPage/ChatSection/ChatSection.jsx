import { InviteModal } from "../Modals/InviteModal";
import { formatMessageTime } from "../utils/chatHelpers";
import { useState, useEffect, useRef } from "react";
import "./ChatSection.css";
import trashIcon from "../../../assets/trash-icon.png";
import { toast } from "react-hot-toast";
import { removeParticipant } from "../../../api/participants";
import EmojiPickerButton from "./EmojiPicker";
import { useConnection } from "../../../context/ConnectionContext";

export const ChatSection = ({
  roomId,
  roomData,
  userInfo,
  messages,
  isInviteModalOpen,
  setIsInviteModalOpen,
  mouseDownOnContentRef,
  handleCloseModal,
}) => {
  const [showNotification, setShowNotification] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const messagesEndRef = useRef(null); // Ref для автопрокрутки чата
  const [showPicker, setShowPicker] = useState(false);
  const timerRef = useRef(null);

  // Получаем функцию переподключения из контекста
  const { connectionRef } = useConnection();

  // Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Обработчик копирования ссылки
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomData.invitationLink);
      setShowNotification(true);

      // Очищаем предыдущий таймер
      if (timerRef.current) clearTimeout(timerRef.current);

      // Устанавливаем новый
      timerRef.current = setTimeout(() => setShowNotification(false), 2000);
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

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleRemoveParticipant = async (userId) => {
    // Находим имя пользователя для отображения в уведомлениях
    const participant = roomData?.participants?.find(
      (p) => p.userId === userId
    );
    const username = participant?.username || "Неизвестный пользователь";

    // Немедленно удаляем пользователя из локального списка участников (визуальное удаление)
    if (roomData && roomData.participants) {
      const updatedParticipants = roomData.participants.filter(
        (p) => p.userId !== userId
      );
      roomData.participants = updatedParticipants;
      // Обновляем UI
      setShowParticipants(false);
      setTimeout(() => setShowParticipants(true), 50);
    }

    // Немедленно добавляем системное сообщение в чат
    const systemMessage = `Пользователь ${username} был исключен из комнаты администратором`;
    connectionRef.current.sendMessage(
      roomId,
      "System",
      "System",
      systemMessage
    );

    try {
      // Отключаем кнопку удаления для предотвращения повторных нажатий
      const button = document.querySelector(
        `.remove-participant-button[data-userid="${userId}"]`
      );
      if (button) {
        button.disabled = true;
        button.style.opacity = "0.5";
      }

      // Показываем уведомление о начале процесса
      toast.loading(`Удаление пользователя ${username}...`, {
        id: `remove-${userId}`,
      });

      // Отправляем запрос на удаление участника
      const response = await removeParticipant(roomId, userId);

      // Заменяем индикатор загрузки на сообщение об успехе
      toast.success(
        response.message || `Пользователь ${username} удален из комнаты`,
        {
          id: `remove-${userId}`,
        }
      );

      console.log(
        `[УЧАСТНИКИ] Пользователь ${userId} (${username}) успешно удален`
      );
    } catch (error) {
      console.error("[УЧАСТНИКИ] Ошибка при удалении участника:", error);

      // Показываем уведомление об ошибке
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        `Не удалось удалить пользователя ${username}`;

      toast.error(errorMessage, { id: `remove-${userId}` });

      // Не восстанавливаем участника в UI даже при ошибке - это создаст впечатление успешного удаления
      // но повторно активируем кнопку, если нужно будет попытаться снова
      const button = document.querySelector(
        `.remove-participant-button[data-userid="${userId}"]`
      );
      if (button) {
        button.disabled = false;
        button.style.opacity = "1";
      }
    }
  };

  // Обработчик клика по эмодзи
  const handleEmojiClick = (emoji) => {
    const input = document.querySelector(".chat-input");
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const text = input.value;
      const newValue = text.substring(0, start) + emoji + text.substring(end);
      input.value = newValue;

      // Устанавливаем курсор после вставленного эмодзи
      const newCursorPos = start + emoji.length;
      input.selectionStart = newCursorPos;
      input.selectionEnd = newCursorPos;

      // Фокусируем поле ввода
      input.focus();
    }
  };

  return (
    <section className="chat-section">
      <div className="chat-header">
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

                    {console.log(
                      "id текущего пользователя: ",
                      userInfo?.userId,
                      "\nusername: ",
                      userInfo?.username
                    )}
                    {/* Кнопка удаления участника (видна только создателю комнаты и не для себя) */}
                    {participant.userId !== userInfo?.userId &&
                      userInfo?.userId === roomData?.createdByUserId && (
                        <button
                          className="remove-participant-button"
                          data-userid={participant.userId}
                          onClick={() =>
                            handleRemoveParticipant(participant.userId)
                          }
                        >
                          <img
                            src={trashIcon}
                            alt="Удалить"
                            width="16"
                            height="16"
                          />
                        </button>
                      )}
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
          invitationLink={roomData?.invitationLink}
          mouseDownOnContentRef={mouseDownOnContentRef}
        />

        {/* Показываем статус соединения */}
        {/* <ConnectionStatus className="chat-connection-status" showText={true} /> */}
      </div>

      <div className="messages-container">
        {/* Сообщения чата */}
        <div className="messages-list">
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
          <div className="input-container">
            <input
              type="text"
              className="chat-input"
              name="chatInput"
              placeholder="Введите сообщение..."
              autoComplete="off" // отключить автозаполнение (логины, пароли и т.д.)
            />
            <div className="emoji-picker-container">
              <EmojiPickerButton
                onEmojiClick={handleEmojiClick}
                showPicker={showPicker}
                setShowPicker={setShowPicker}
              />
            </div>
          </div>
          <button
            type="submit"
            onClick={() => setShowPicker(false)}
            className="chat-button"
          >
            Чат
          </button>
        </form>
      </div>
    </section>
  );
};
