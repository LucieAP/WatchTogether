import { AddVideoModal } from "../Modals/AddVideoModal";
import { CloseVideoModal } from "../Modals/CloseVideoModal";
import VideoPlayer from "../../VideoPlayer/VideoPlayer";
import { useState, useCallback, memo } from "react";
import "./VideoSection.css";

export const VideoSection = memo(
  ({
    roomId,
    roomData,
    playerRef,
    handlePlayPause,
    handleTimeUpdate,
    handleCloseVideo,
    videoUrl,
    tempMetadata,
    setVideoUrl,
    setTempMetadata,
    handleAddVideoModal,
    isAddVideoModalOpen,
    setIsAddVideoModalOpen,
    isChatVisible,
    toggleChatVisibility,
  }) => {
    const [isCloseVideoModalOpen, setIsCloseVideoModalOpen] = useState(false);

    // Мемоизируем обработчики для модальных окон
    // Пустой массив в качестве зависимостей означает, что эти функции запомнятся один раз и будут одинаковыми при всех последующих рендерах.
    const openCloseVideoModal = useCallback(
      () => setIsCloseVideoModalOpen(true),
      []
    );
    const closeVideoModal = useCallback(
      () => setIsCloseVideoModalOpen(false),
      []
    );

    // Мемоизируем обработчик закрытия модального окна добавления видео
    // Сброс метаданных и URL видео при закрытии модалки
    const closeAddVideoModal = useCallback(() => {
      setIsAddVideoModalOpen(false);
      setVideoUrl("");
      setTempMetadata({ title: "", duration: 0 });
    }, [setIsAddVideoModalOpen, setVideoUrl, setTempMetadata]);

    // Выносим обработчик нажатия на кнопку добавления видео
    const handleAddVideoButtonClick = useCallback(
      (e) => {
        e && e.stopPropagation();
        console.log("Нажата кнопка добавления видео");
        setIsAddVideoModalOpen(true);
      },
      [setIsAddVideoModalOpen]
    );

    // Оптимизируем обработчик onVideoAdded
    const handleVideoAdded = useCallback(
      (e) => {
        e && e.stopPropagation();
        setIsAddVideoModalOpen(true);
      },
      [setIsAddVideoModalOpen]
    );

    // Остановка всплытия для обработчика handleAddVideoModal
    const wrappedHandleAddVideoModal = useCallback(
      (e) => {
        e && e.stopPropagation();
        handleAddVideoModal(e);
      },
      [handleAddVideoModal]
    );

    // Обработчик для CloseVideoModal
    const wrappedHandleCloseVideo = useCallback(
      (e) => {
        e && e.stopPropagation();
        handleCloseVideo(e);
        setIsCloseVideoModalOpen(false); // Закрываем модальное окно
      },
      [handleCloseVideo, setIsCloseVideoModalOpen]
    );

    return (
      <section className="video-section">
        {/* Кнопка скрытия/показа чата */}
        <button
          className="toggle-chat-button"
          onClick={toggleChatVisibility}
          title={isChatVisible ? "Скрыть чат" : "Показать чат"}
        >
          {isChatVisible ? "→" : "←"}
        </button>

        {roomData?.currentVideo?.videoId ? (
          <>
            <VideoPlayer
              ref={playerRef}
              roomId={roomId}
              currentVideoId={roomData.currentVideo.videoId}
              playing={!roomData.isPaused}
              currentTime={roomData.currentTime}
              onVideoAdded={handleVideoAdded}
              onPlayPause={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Компактная кнопка закрытия видео */}
            <button
              className="mini-close-video-button"
              onClick={openCloseVideoModal}
              title="Закрыть видео"
            >
              ✕
            </button>

            <CloseVideoModal
              isOpen={isCloseVideoModalOpen}
              onClose={closeVideoModal}
              onConfirm={wrappedHandleCloseVideo}
            />
          </>
        ) : (
          <button
            className="center-add-video-btn"
            onClick={handleAddVideoButtonClick}
          >
            +
          </button>
        )}
        {/* Модалка добавления видео */}
        <AddVideoModal
          isOpen={isAddVideoModalOpen}
          videoUrl={videoUrl}
          tempMetadata={tempMetadata}
          onUrlChange={setVideoUrl}
          onMetadataChange={setTempMetadata}
          onClose={closeAddVideoModal}
          onSubmit={wrappedHandleAddVideoModal}
        />
      </section>
    );
  }
);
