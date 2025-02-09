// const API_BASE = "/api";

// export const apiClient = {
//   get: async (url) => {
//     const response = await fetch(`${API_BASE}${url}`);

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.title || "Ошибка сервера");
//     }

//     return response.json();
//   },
//   // post: async (url, data) => {
//   //   /* ... */
//   // },
// };

import axios from "axios";

const API_BASE = "/api";

// Создаём экземпляр Axios с базовыми настройками
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Перехватчик для обработки ошибок

// Если запрос успешен, автоматически возвращаются только response.data (а не весь объект response).
// Если есть ошибка, создаётся объект Error с текстом ошибки из ответа сервера.

apiClient.interceptors.response.use(
  (response) => response.data, // Автоматически возвращаем данные
  (error) => {
    const serverError = error.response?.data?.title || "Ошибка сервера";
    throw new Error(serverError);
  }
);

export { apiClient };
