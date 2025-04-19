import { AddVideoModal } from "../Modals/AddVideoModal";
import { CloseVideoModal } from "../Modals/CloseVideoModal";
import VideoPlayer from "../../VideoPlayer/VideoPlayer";
import { useState } from "react";
import "./VideoSection.css";

export const VideoSection = ({
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
  const openCloseVideoModal = () => setIsCloseVideoModalOpen(true);
  const closeVideoModal = () => setIsCloseVideoModalOpen(false);

  // console.log("isAddVideoModalOpen", isAddVideoModalOpen);

  // Сброс метаданных при закрытии модалки
  const closeAddVideoModal = () => {
    // console.log("Закрываем модальное окно добавления видео");
    setIsAddVideoModalOpen(false);
    setVideoUrl("");
    setTempMetadata({ title: "", duration: 0 });
  };

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
            onVideoAdded={() => setIsAddVideoModalOpen(true)}
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

            {/* {console.log(
                "Rendering modal check, isCloseVideoModalOpen:",
                isCloseVideoModalOpen
              )} */}

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
          onClick={() => {
            console.log("Нажата кнопка добавления видео");
            setIsAddVideoModalOpen(true);
          }}
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
};
