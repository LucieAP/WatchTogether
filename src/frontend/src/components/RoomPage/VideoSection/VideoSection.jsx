import { AddVideoModal } from "../Modals/AddVideoModal";
import { CloseVideoModal } from "../Modals/CloseVideoModal";
import { useState, useCallback, memo } from "react";
import "./VideoSection.css";
import { VideoPlayer } from "../../VideoPlayer/VideoPlayer";
import VkVideoPlayer from "../../VideoPlayer/VkVideoPlayer";

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
    isRoomCreator,
    videoType,
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

    // Функция для определения правильного типа видео
    const isYouTubeVideo = (typeValue) => {
      return (
        typeValue === 0 ||
        typeValue === "0" ||
        typeValue === "youtube" ||
        typeValue === "YouTube"
      );
    };

    const isVkVideo = (typeValue) => {
      return (
        typeValue === 1 ||
        typeValue === "1" ||
        typeValue === "vk" ||
        typeValue === "VK"
      );
    };

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
            {console.log("Тип видео: ", roomData.currentVideo.videoType)}

            {isYouTubeVideo(roomData.currentVideo.videoType) && (
              <VideoPlayer
                ref={playerRef}
                roomId={roomId}
                currentVideoId={roomData.currentVideo.videoId}
                playing={!roomData.isPaused}
                currentTime={roomData.currentTime}
                onVideoAdded={handleVideoAdded}
                onPlayPause={handlePlayPause}
                onTimeUpdate={handleTimeUpdate}
                isRoomCreator={isRoomCreator}
                canControlVideo={roomData?.canControlVideo}
              />
            )}

            {/* {isVkVideo(roomData.currentVideo.videoType) && (
              <VkVideoPlayer
                ref={playerRef}
                ownerId={roomData.currentVideo.videoId.split("_")[0]}
                videoId={roomData.currentVideo.videoId.split("_")[1]}
                playing={!roomData.isPaused}
                currentTime={roomData.currentTime}
                onPlayPause={handlePlayPause}
                onTimeUpdate={handleTimeUpdate}
                onError={(error) => console.error("VK player error:", error)}
              />
            )} */}

            {/* {!isYouTubeVideo(roomData.currentVideo.videoType) &&
              !isVkVideo(roomData.currentVideo.videoType) && (
                <div className="video-error-message">
                  <p>
                    Ошибка загрузки видео. Тип видео не определен:{" "}
                    {roomData.currentVideo.videoType}
                  </p>
                  <button
                    onClick={handleCloseVideo}
                    className="error-close-button"
                  >
                    Закрыть видео
                  </button>
                </div>
              )} */}

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
