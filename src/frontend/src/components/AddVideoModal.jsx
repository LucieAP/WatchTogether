import ReactPlayer from "react-player";

export const AddVideoModal = ({
  videoUrl,
  tempMetadata,
  onUrlChange,
  onMetadataChange,
  onClose,
  onSubmit,
}) => {
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

  return (
    <div className="modal" onClick={onClose}>
      {/* Добавим скрытый плеер */}
      <ReactPlayer
        url={videoUrl}
        onReady={handleTempPlayerReady}
        onDuration={handleTempDuration}
        style={{ display: "none" }} // не отображается
      />

      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Добавить видео</h2>
        <input
          type="text"
          placeholder="Вставьте ссылку YouTube"
          value={videoUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <div className="modal-buttons">
          <button
            className="btn"
            onClick={onSubmit}
            disabled={!tempMetadata.duration} // Проверка загрузки данных в кнопке
          >
            Добавить
          </button>
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
