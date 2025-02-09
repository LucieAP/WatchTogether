import { apiClient } from "./client";

export const getRooms = async () => {
  try {
    return await apiClient.get("/Rooms"); // GET : api/Rooms
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
};
