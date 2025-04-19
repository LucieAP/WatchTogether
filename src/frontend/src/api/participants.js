import axios from "axios";

/**
 * Получает список участников комнаты
 * @param {string} roomId - ID комнаты
 * @returns {Promise} - Промис с результатом запроса и списком участников
 */
export const getRoomParticipants = async (roomId) => {
  try {
    const response = await axios.get(`/api/Rooms/${roomId}`);
    return response.data.room.participants;
  } catch (error) {
    console.error("Ошибка при получении участников комнаты:", error);
    throw error;
  }
};

/**
 * Удаляет участника из комнаты
 * @param {string} roomId - ID комнаты
 * @param {string} userId - ID удаляемого участника
 * @returns {Promise} - Промис с результатом запроса
 */
export const removeParticipant = async (roomId, userId) => {
  try {
    const response = await axios.delete(
      `/api/Rooms/${roomId}/participants/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Ошибка при удалении участника:", error);
    throw error;
  }
};
