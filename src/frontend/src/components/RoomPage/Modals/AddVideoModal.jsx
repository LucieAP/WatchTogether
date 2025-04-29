import ReactPlayer from "react-player";
import styles from "./Modal.module.css";
import { useState, useEffect, useCallback } from "react";
import { extractVkVideoParams, getVideoType } from "../utils/videoHelpers";

export const AddVideoModal = ({
  isOpen,
  videoUrl,
  tempMetadata,
  onUrlChange,
  onMetadataChange,
  onClose,
  onSubmit,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [videoType, setVideoType] = useState(null);

  // Следим за изменением URL и устанавливаем состояние загрузки и тип видео
  useEffect(() => {
    if (!videoUrl) {
      setIsLoading(false);
      setVideoType(null);
      return;
    }

    const videoType = getVideoType(videoUrl);
    setVideoType(videoType);

    if (videoType === "youtube") {
      setIsLoading(true);
    } else if (videoType === "vk") {
      setIsLoading(true);
      // Для VK видео попытаемся извлечь информацию из URL
      const vkParams = extractVkVideoParams(videoUrl);
      if (vkParams) {
        // Устанавливаем базовые метаданные для VK видео
        onMetadataChange({
          title: `VK Видео ${vkParams.ownerId}_${vkParams.videoId}`,
          duration: 0, // VK API не дает получить длительность в моменте, установим 0 для разрешения добавления
        });
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [videoUrl, onMetadataChange]);

  // Проверка готовности плеера (для YouTube)
  const handleTempPlayerReady = useCallback(
    (player) => {
      if (videoType !== "youtube") return;

      const internalPlayer = player.getInternalPlayer(); // Доступ к внутреннему плееру
      if (internalPlayer?.getVideoData) {
        const data = internalPlayer.getVideoData();
        onMetadataChange((prev) => ({ ...prev, title: data.title }));
      }
    },
    [onMetadataChange, videoType]
  );

  // Получение длительности видео из скрытого плеера (для YouTube)
  const handleTempDuration = useCallback(
    (duration) => {
      if (videoType === "youtube") {
        onMetadataChange((prev) => ({
          ...prev,
          duration: Math.round(duration),
        }));
      }
      setIsLoading(false); // Отключаем индикатор загрузки, когда получена длительность
    },
    [onMetadataChange, videoType]
  );

  // Предотвращаем всплытие события для контента модального окна (для YouTube)
  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Обработчик для кнопки добавления
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
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
  // Для VK видео мы разрешаем добавление даже с нулевой длительностью
  const isAddButtonDisabled =
    (videoType === "youtube" && !tempMetadata.duration) ||
    isLoading ||
    !videoType;

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      {/* Добавим скрытый плеер */}
      {videoType === "youtube" && (
        <ReactPlayer
          url={videoUrl}
          onReady={handleTempPlayerReady}
          onDuration={handleTempDuration}
          style={{ display: "none" }} // не отображается
          playing={false} // Добавить явное отключение воспроизведения
          playsinline // Для корректной работы в мобильных браузерах
        />
      )}

      <form
        className={styles.modalContent}
        onClick={handleContentClick}
        onSubmit={handleSubmit}
      >
        <h2 className={styles.modalTitle}>Добавить видео</h2>
        <input
          type="text"
          className={styles.input}
          // placeholder="Вставьте ссылку YouTube или ВК"
          placeholder="Вставьте ссылку YouTube"
          value={videoUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />

        {/* Показываем информацию о типе видео */}
        {videoType && (
          <div className={styles.videoTypeInfo}>
            <span>
              Тип видео:{" "}
              {videoType === "youtube"
                ? "YouTube"
                : videoType === "vk"
                ? "ВКонтакте"
                : "Неизвестный"}
            </span>
            {tempMetadata.title && <span>Название: {tempMetadata.title}</span>}
          </div>
        )}

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
