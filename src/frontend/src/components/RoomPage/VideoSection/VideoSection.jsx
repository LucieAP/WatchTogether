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
    const handleAddVideoButtonClick = useCallback(() => {
      console.log("Нажата кнопка добавления видео");
      setIsAddVideoModalOpen(true);
    }, [setIsAddVideoModalOpen]);

    // Оптимизируем обработчик onVideoAdded
    const handleVideoAdded = useCallback(() => {
      setIsAddVideoModalOpen(true);
    }, [setIsAddVideoModalOpen]);

    return (
      <section className="video-section">
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

            {/* Модалка подтверждения закрытия видео */}
            <div className="close-video-container">
              {/* Кнопка закрытия плеера */}
              <button
                className="close-video-button"
                onClick={openCloseVideoModal}
              >
                Закрыть видео
              </button>

              <CloseVideoModal
                isOpen={isCloseVideoModalOpen}
                onClose={closeVideoModal}
                onConfirm={handleCloseVideo}
              />
            </div>
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
          onSubmit={handleAddVideoModal}
        />
      </section>
    );
  }
);
