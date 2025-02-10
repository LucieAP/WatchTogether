import { apiClient } from "./client";

export const getRooms = async () => {
  try {
    return await apiClient.get("/Rooms"); // GET : api/Rooms
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
};

export const createRoom = async (roomData) => {
  try {
    const response = await apiClient.post("Rooms/Create", roomData); // Отправляем roomData, которые получаем при вызове
    return response;
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
};

export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await apiClient.put(`/Rooms/${roomId}`, roomData);
    console.log("Ответ сервера (room.js):", response); // Логируем напрямую
    return response;
  } catch (error) {
    console.error("Error updating room:", error);
    throw error;
  }
};
