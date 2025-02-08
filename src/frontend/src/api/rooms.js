import { apiClient } from "./client";

export const getRooms = async () => {
  try {
    return await apiClient.get("/Rooms");
  } catch (error) {
    console.error("Error fetching rooms:", error);
    throw error;
  }
};

// export const createRoom = async (roomData) => {
//   try {
//     const response = await fetch("/api/Rooms/Create", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(roomData),
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.title || "Ошибка сервера");
//     }

//     const result = await response.json();

//     // Обработка пользовательских данных
//     if (result.user?.userId) {
//       localStorage.setItem("userId", result.user.userId);
//       document.cookie = `X-User-Id=${result.user.userId}; path=/; max-age=${
//         7 * 24 * 60 * 60
//       }`;
//     }

//     return result;
//   } catch (error) {
//     console.error("API Error:", error);
//     throw error;
//   }
// };
