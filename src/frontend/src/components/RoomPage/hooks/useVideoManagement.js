import { useState } from "react";
import { addVideo, removeVideo } from "../../../api/video";
import {
  isValidYouTubeUrl,
  extractYouTubeVideoId,
} from "../utils/videoHelpers";

export function useVideoManagement(roomId, setRoomData) {
  const [videoUrl, setVideoUrl] = useState("");
  const [tempMetadata, setTempMetadata] = useState({ title: "", duration: 0 });
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);

  // Обработчик добавления видео
  const handleAddVideoModal = async (event) => {
    // Предотвращаем всплытие события, если оно есть
    if (event && event.stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log("Вызвана функция handleAddVideoModal");
    console.log("videoUrl:", videoUrl);
    const videoId = extractYouTubeVideoId(videoUrl); // id видео ютуба (11 цифр)

    if (isValidYouTubeUrl(videoUrl)) {
      try {
        // Используем данные из tempMetadata
        const { title, duration } = tempMetadata;

        console.log("videoId: ", videoId);
        console.log("duration: ", duration);
        console.log("title: ", title);

        // Обновляем видео в комнате на бэкенде
        await addVideo(roomId, videoId, title, duration);

        // Обновляем состояние
        setRoomData((prev) => ({
          ...prev,
          currentVideoId: videoId,
          currentVideo: { videoId, title, duration },
        }));

        setIsAddVideoModalOpen(false);
        setVideoUrl("");
        setTempMetadata({ title: "", duration: 0 }); // Сброс метаданных
      } catch (error) {
        console.error("Ошибка при обновлении видео:", error);
      }
    } else {
      alert("Пожалуйста, введите корректную ссылку YouTube");
    }
  };

  // Обработчик удаления видео
  const handleCloseVideo = async () => {
    try {
      await removeVideo(roomId);

      // Обновляем локальное состояние
      setRoomData((prev) => ({
        ...prev,
        currentVideoId: null,
        currentVideo: null,
      }));
    } catch (error) {
      console.error("Ошибка при удалении видео:", error);
    }
  };

  return {
    videoUrl,
    setVideoUrl,
    tempMetadata,
    setTempMetadata,
    isAddVideoModalOpen,
    setIsAddVideoModalOpen,
    handleAddVideoModal,
    handleCloseVideo,
  };
}
