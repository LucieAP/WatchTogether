import axios from "axios";

/**
 * Добавляет видео в комнату
 * @param {string} roomId - ID комнаты
 * @param {string} videoId - ID видео
 * @param {string} title - Название видео
 * @param {number} duration - Продолжительность видео
 * @param {number} videoType - Тип видео (0 - YouTube, 1 - VK)
 * @returns {Promise} - Промис с результатом запроса
 */
export const addVideo = async (
  roomId,
  videoId,
  title,
  duration,
  videoType = 0 // 0 - YouTube, 1 - Vk
) => {
  try {
    console.log("addVideo: ", roomId, videoId, title, duration, videoType);
    const response = await axios.put(`/api/Rooms/${roomId}/video`, {
      videoId,
      title,
      durationInSeconds: duration,
      videoType,
    });
    return response.data;
  } catch (error) {
    console.error("Ошибка при добавлении видео:", error);
    throw error;
  }
};

/**
 * Удаляет видео из комнаты
 * @param {string} roomId - ID комнаты
 * @returns {Promise} - Промис с результатом запроса
 */
export const removeVideo = async (roomId) => {
  try {
    const response = await axios.delete(`/api/Rooms/${roomId}/video`);
    return response.data;
  } catch (error) {
    // Извлекаем сообщение об ошибке из ответа, если оно доступно
    const errorMessage =
      error.response?.data?.message ||
      "Не удалось удалить видео. Пожалуйста, попробуйте позже.";
    throw new Error(errorMessage);
  }
};
