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
