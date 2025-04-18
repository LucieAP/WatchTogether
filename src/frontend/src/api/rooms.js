// API для взаимодействия с комнатами
import { apiClient } from "./client";

export const getRooms = async () => {
  try {
    return await apiClient.get("/Rooms"); // GET : api/Rooms
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
};

export const getPublicRooms = async () => {
  try {
    return await apiClient.get("/Rooms/Public"); // GET : api/Rooms/Public
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    throw error;
  }
};

export const createRoom = async (roomData) => {
  try {
    const response = await apiClient.post("/Rooms/Create", roomData); // Отправляем roomData, которые получаем при вызове
    return response;
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
};

export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await apiClient.put(`/Rooms/${roomId}`, roomData);
    console.log("Ответ сервера (room.js):", response);
    return response;
  } catch (error) {
    console.error("Error updating room:", error);
    throw error;
  }
};

export const getRoom = async (roomId) => {
  try {
    return await apiClient.get(`/Rooms/${roomId}`);
  } catch (error) {
    console.error("Error fetching room:", error);
    throw error;
  }
};

// export const updateVideo = async (roomId) => {
//   try {
//     return await apiClient.post(`/Rooms/${roomId}/video`, videoId);
//   } catch (error) {
//     throw error;
//   }
// };

// Получение списка комнат, созданных пользователем
export const getUserRooms = async () => {
  try {
    const response = await apiClient.get("/Rooms/MyRooms"); // GET : api/Rooms/MyRooms
    console.log("Список комнат пользователя:", response);
    return response;
  } catch (error) {
    console.error("Ошибка при получении комнат пользователя:", error);
    throw error;
  }
};

// Удаление комнаты
export const deleteRoom = async (roomId) => {
  try {
    return await apiClient.delete(`/Rooms/${roomId}`); // DELETE: api/Rooms/{roomId}
  } catch (error) {
    console.error("Ошибка при удалении комнаты:", error);
    throw error;
  }
};

// Удаление всех комнат пользователя
export const deleteAllUserRooms = async () => {
  try {
    return await apiClient.delete("/Rooms/DeleteAllRooms"); // DELETE: api/Rooms/DeleteAllRooms
  } catch (error) {
    console.error("Ошибка при удалении всех комнат:", error);
    throw error;
  }
};
