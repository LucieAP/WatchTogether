import ReactPlayer from "react-player";
import styles from "./Modal.module.css";
import { useState, useEffect, useCallback } from "react";
import { isValidYouTubeUrl } from "../utils/videoHelpers";

export const AddVideoModal = ({
  isOpen,
  videoUrl,
  tempMetadata,
  onUrlChange,
  onMetadataChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);

  // Следим за изменением URL и устанавливаем состояние загрузки
  useEffect(() => {
    if (videoUrl && isValidYouTubeUrl(videoUrl)) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [videoUrl]);

  // Проверка готовности плеера
  const handleTempPlayerReady = useCallback(
    (player) => {
      const internalPlayer = player.getInternalPlayer(); // Доступ к внутреннему плееру
      if (internalPlayer?.getVideoData) {
        const data = internalPlayer.getVideoData();
        onMetadataChange((prev) => ({ ...prev, title: data.title }));
      }
    },
    [onMetadataChange]
  );

  // Получение длительности видео из скрытого плеера
  const handleTempDuration = useCallback(
    (duration) => {
      onMetadataChange((prev) => ({ ...prev, duration: Math.round(duration) }));
      setIsLoading(false); // Отключаем индикатор загрузки, когда получена длительность
    },
    [onMetadataChange]
  );

  // Предотвращаем всплытие события для контента модального окна
  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Обработчик для кнопки добавления
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Предотвращаем всплытие события и выполнение стандартного действия формы
      onSubmit();
    },
    [onSubmit]
  );

  // Обработчик для кнопки закрытия
  const handleClose = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Предотвращаем всплытие при клике на оверлей
  const handleOverlayClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Проверка возможности добавления видео
  const isAddButtonDisabled = !tempMetadata.duration || isLoading;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      {/* Добавим скрытый плеер */}
      <ReactPlayer
        url={videoUrl}
        onReady={handleTempPlayerReady}
        onDuration={handleTempDuration}
        style={{ display: "none" }} // не отображается
      />

      <form
        className={styles.modalContent}
        onClick={handleContentClick}
        onSubmit={handleSubmit}
      >
        <h2 className={styles.modalTitle}>Добавить видео</h2>
        <input
          type="text"
          className={styles.input}
          placeholder="Вставьте ссылку YouTube"
          value={videoUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />

        <div className={styles.modalButtons}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonSuccess} ${
              isAddButtonDisabled ? styles.buttonDisabled : ""
            }`}
            onClick={handleSubmit}
            disabled={isAddButtonDisabled}
          >
            {isLoading ? "Загрузка..." : "Добавить"}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={handleClose}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};
