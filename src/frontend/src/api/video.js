import axios from "axios";

/**
 * Добавляет видео в комнату
 * @param {string} roomId - ID комнаты
 * @param {string} videoId - ID видео
 * @param {string} title - Название видео
 * @param {number} duration - Продолжительность видео
 * @returns {Promise} - Промис с результатом запроса
 */
export const addVideo = async (roomId, videoId, title, duration) => {
  try {
    const response = await axios.put(`/api/Rooms/${roomId}/video`, {
      videoId,
      title,
      duration,
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
