import ReactPlayer from "react-player";
import styles from "./Modal.module.css";

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

  // Проверка готовности плеера
  const handleTempPlayerReady = (player) => {
    const internalPlayer = player.getInternalPlayer(); // Доступ к внутреннему плееру
    if (internalPlayer?.getVideoData) {
      const data = internalPlayer.getVideoData();
      onMetadataChange((prev) => ({ ...prev, title: data.title }));
    }
  };

  // Получение длительности видео из скрытого плеера
  const handleTempDuration = (duration) => {
    onMetadataChange((prev) => ({ ...prev, duration: Math.round(duration) }));
  };

  // Предотвращаем всплытие события для контента модального окна
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Обработчик для кнопки добавления
  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* Добавим скрытый плеер */}
      <ReactPlayer
        url={videoUrl}
        onReady={handleTempPlayerReady}
        onDuration={handleTempDuration}
        style={{ display: "none" }} // не отображается
      />

      <div className={styles.modalContent} onClick={handleContentClick}>
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
            className={`${styles.button} ${styles.buttonSuccess}`}
            onClick={handleSubmit}
            disabled={!tempMetadata.duration} // Проверка загрузки данных в кнопке
          >
            Добавить
          </button>
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
