import axios from "axios";

const API_BASE = "/api";

// Создаём экземпляр Axios с базовыми настройками
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // <-- Ключевая настройка
  headers: {
    "Content-Type": "application/json", // Устанавливает заголовок Content-Type: application/json по умолчанию
  },
});

// Перехватчик для обработки ошибок

// Если запрос успешен, автоматически возвращаются только response.data (а не весь объект response)
// (избавляет от необходимости каждый раз вручную извлекать данные из ответа).
// Если есть ошибка, создаётся объект Error с текстом ошибки из ответа сервера.

apiClient.interceptors.response.use(
  (response) => response.data, // Автоматически возвращаем данные
  (error) => {
    const serverError = error.response?.data?.title || "Ошибка сервера";
    throw new Error(serverError);
  }
);

export { apiClient };
