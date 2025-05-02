// API клиент для взаимодействия с сервером
import axios from "axios";

// Определяем базовый URL в зависимости от окружения
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api` // Абсолютный URL для продакшена
  : "/api"; // Относительный URL для разработки (через прокси vite)

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

    // Создаем расширенный объект ошибки
    const enhancedError = new Error(errorMessage);

    // Добавляем дополнительную информацию об ошибке
    enhancedError.statusCode = error.response?.status;
    enhancedError.originalError = error;
    enhancedError.responseData = error.response?.data;

    // Добавляем информацию о статус коде
    if (error.response) {
      switch (error.response.status) {
        case 400:
          enhancedError.type = "BAD_REQUEST";
          break;
        case 401:
          enhancedError.type = "UNAUTHORIZED";
          break;
        case 403:
          enhancedError.type = "FORBIDDEN";
          break;
        case 404:
          enhancedError.type = "NOT_FOUND";
          break;
        case 500:
          enhancedError.type = "SERVER_ERROR";
          break;
        default:
          enhancedError.type = "UNKNOWN_ERROR";
      }
    } else {
      enhancedError.type = "NETWORK_ERROR";
    }

    // Логируем ошибку в консоль для отладки
    console.error(`API Error [${enhancedError.type}]:`, errorMessage, error);

    throw enhancedError;
  }
);

export { apiClient };
