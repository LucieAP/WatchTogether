import { useState, useEffect } from "react";
import styles from "./Modal.module.css";

// Параметры для текста
const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

export const SettingsModal = ({
  isOpen,
  onClose,
  onSave,
  onSettingsClose,
  mouseDownOnContentRef,
  roomName: initialRoomName,
  description: initialDescription,
  canControlVideo,
}) => {
  // Создаем локальное состояние для отслеживания изменений
  const [roomName, setRoomName] = useState(initialRoomName);
  const [description, setDescription] = useState(initialDescription);

  // Проверяем права доступа при открытии модального окна
  useEffect(() => {
    if (isOpen && !canControlVideo) {
      // Если у пользователя нет прав, показываем уведомление и закрываем окно
      alert("В публичной комнате только ведущий может изменять настройки");
      onSettingsClose();
    }
  }, [isOpen, canControlVideo, onSettingsClose]);

  // Если модальное окно не открыто или у пользователя нет прав, не отображаем его
  if (!isOpen) return null;
  if (!canControlVideo) return null;

  // Функция для сохранения изменений
  const handleSave = () => {
    onSave({ roomName, description });
  };

  return (
    <div
      className={styles.modalOverlay}
      id="settings-modal"
      onClick={onClose}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          mouseDownOnContentRef.current = false;
        }
      }}
    >
      <div
        className={styles.modalContent}
        onMouseDown={() => {
          mouseDownOnContentRef.current = true;
        }}
      >
        <h2 className={styles.modalTitle}>Настройки комнаты</h2>
        <div className="form-group">
          <label htmlFor="room-name-input">Название комнаты:</label>
          <input
            id="room-name-input"
            value={roomName}
            className={styles.input}
            {...INPUT_PROPS}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="room-description-input">Описание:</label>
          <textarea
            id="room-description-input"
            value={description}
            className={styles.input}
            {...INPUT_PROPS}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.modalButtons}>
          <button
            className={`${styles.button} ${styles.buttonSuccess}`}
            onClick={handleSave}
          >
            Сохранить
          </button>
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onSettingsClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
