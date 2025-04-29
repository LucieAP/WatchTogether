// API функции для работы с health check эндпоинтами
import { apiClient } from "./client";

// Удаляем жестко заданный URL и используем относительные пути
// const HEALTH_API_BASE = "https://localhost:7143/api";

/**
 * Получает полную информацию о состоянии сервера
 * @returns {Promise<Object>} Объект с подробной информацией о состоянии сервера
 */
export const getHealthStatus = async () => {
  try {
    // Используем apiClient напрямую, так как он уже настроен на базовый путь /api
    const response = await apiClient.get(`health`);

    console.log("Полный ответ от health API:", response);
    return response;
  } catch (error) {
    console.error("Ошибка проверки состояния сервера:", error);
    return { status: "Error", error: error.message };
  }
};

/**
 * Проверяет работоспособность сервера
 * @returns {Promise<Object>} Объект со статусом работоспособности сервера
 */
export const getLivenessStatus = async () => {
  try {
    const response = await apiClient.get(`health/live`);
    return response;
  } catch (error) {
    console.error("Ошибка проверки статуса работоспособности сервера:", error);
    return { status: "Error", error: error.message };
  }
};

/**
 * Проверяет готовность сервера
 * @returns {Promise<Object>} Объект со статусом готовности сервера
 */
export const getReadinessStatus = async () => {
  try {
    const response = await apiClient.get(`health/ready`);
    return response;
  } catch (error) {
    console.error("Ошибка проверки готовности сервера:", error);
    return { status: "Error", error: error.message };
  }
};
