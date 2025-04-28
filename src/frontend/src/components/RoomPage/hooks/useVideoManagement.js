import { useState } from "react";
import { addVideo, removeVideo } from "../../../api/video";
import {
  isValidVideoUrl,
  extractYouTubeVideoId,
  extractVkVideoParams,
  getVideoType,
  isValidYouTubeUrl,
} from "../utils/videoHelpers";
import { toast } from "react-hot-toast";

export function useVideoManagement(roomId, setRoomData) {
  const [videoUrl, setVideoUrl] = useState("");
  const [tempMetadata, setTempMetadata] = useState({ title: "", duration: 0 });
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);

  const [videoType, setVideoType] = useState(null);
  const [videoParams, setVideoParams] = useState(null);

  const extractVideoData = (videoUrl) => {
    if (!videoUrl) {
      setVideoType(null);
      setVideoParams(null);
      console.error("URL видео и ID отсутствуют");
      return { videoId: null, videoType: null, videoParams: null };
    }

    const videoType = getVideoType(videoUrl);
    setVideoType(videoType);

    let videoId = null;
    let params = null;

    if (videoType === "youtube") {
      videoId = extractYouTubeVideoId(videoUrl);
      console.log("Извлеченный ID YouTube:", videoId);
      if (!videoId) {
        console.error("Не удалось извлечь ID из URL:", videoUrl);
        return { videoId: null, videoType: null, videoParams: null };
      }
      params = { videoId };
      console.log("Извлеченные параметры YouTube:", params);
      setVideoParams(params);
    } else if (videoType === "vk") {
      params = extractVkVideoParams(videoUrl);
      console.log("Извлеченные параметры VK:", params);
      if (!params) {
        throw new Error("Не удалось извлечь параметры видео ВКонтакте");
      }
      setVideoParams(params);
    } else {
      console.error("Не удалось извлечь параметры из URL:", videoUrl);
      setVideoParams(null);
    }

    return { videoId, videoType, videoParams: params };
  };

  // Обработчик добавления видео
  const handleAddVideoModal = async (event) => {
    console.log("Вызвался метод handleAddVideoModal");

    // Предотвращаем всплытие события, если оно есть
    if (event && event.stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log("videoUrl:", videoUrl);

    const { videoId, videoType, videoParams } = extractVideoData(videoUrl);
    console.log("Определенный тип видео:", videoType);

    if (isValidVideoUrl(videoUrl)) {
      try {
        // Используем данные из tempMetadata
        const { title, duration } = tempMetadata;
        let videoData = {};

        console.log("videoId: ", videoId);
        console.log("duration: ", duration);
        console.log("title: ", title);

        if (videoType === "youtube") {
          videoData = {
            videoId,
            title,
            duration,
            url: videoUrl,
            videoType: "youtube",
          };
          console.log("youtube videoData: ", videoData);
        } else if (videoType === "vk") {
          const ownerId = videoParams.ownerId;
          const videoId = videoParams.videoId;
          console.log("ownerId: ", ownerId);
          console.log("videoId: ", videoId);

          const vkFormattedVideoId = `${ownerId}_${videoId}`;
          console.log("vkFormattedVideoId: ", vkFormattedVideoId);

          videoData = {
            videoId: vkFormattedVideoId,
            title,
            duration,
            url: videoUrl,
            videoType: "vk",
            videoParams,
          };
          console.log("vk videoData: ", videoData);
        }

        // Обновляем видео в комнате на бэкенде
        console.log("videoData.videoId:", videoData.videoId);
        console.log("videoData.title:", videoData.title);
        console.log("videoData.duration:", videoData.duration);

        // Обновляем видео в комнате на бэкенде

        if (videoType === "youtube") {
          await addVideo(roomId, videoId, title, duration, 0);
          console.log("Добавлен плеер: YouTube");
        } else if (videoType === "vk") {
          await addVideo(roomId, videoData.videoId, title, duration, 1);
          console.log("Добавлен плеер: VK");
        }

        // Обновляем состояние
        setRoomData((prev) => ({
          ...prev,
          currentVideoId: videoId,
          currentVideo: { ...videoData },
        }));

        setIsAddVideoModalOpen(false);
        setVideoUrl("");
        setTempMetadata({ title: "", duration: 0 }); // Сброс метаданных

        toast.success(
          `Видео ${
            videoType === "youtube" ? "YouTube" : "ВКонтакте"
          } успешно добавлено`
        );
      } catch (error) {
        console.error("Ошибка при обновлении видео:", error);
        if (error.response?.status === 400) {
          toast.error(
            "Сервер не смог обработать запрос. Возможно, формат видео не поддерживается."
          );
        } else {
          toast.error(error.message || "Ошибка при добавлении видео");
        }
      }
    } else {
      toast.error(
        "Пожалуйста, введите корректную ссылку YouTube или ВКонтакте"
      );
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

      toast.success("Видео успешно удалено");
    } catch (error) {
      console.error("Ошибка при удалении видео:", error);
      // Показываем пользователю сообщение об ошибке
      toast.error(error.message || "Ошибка при удалении видео");
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
    videoType,
    setVideoType,
  };
}
