// API клиент для взаимодействия с сервером
import axios from "axios";

// Используем относительный путь, чтобы запросы шли через прокси настроенный в vite.config.js
// Это позволит правильно генерировать URL-адреса на сервере через HttpContext.Request
const API_BASE = "/api";

// Создаём экземпляр Axios с базовыми настройками
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Браузер по умолчанию не отправляет cookies на другике домены. withCredentials: true позволяет их передавать
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
    // Получаем сообщение об ошибке из разных возможных мест в ответе
    const errorMessage =
      error.response?.data?.message || // Проверяем наличие поля message
      error.response?.data?.Message || // Проверяем наличие поля Message (с большой буквы)
      error.response?.data?.title ||
      error.message ||
      "Ошибка сервера";

    throw new Error(errorMessage);
  }
);

export { apiClient };
