import { apiClient } from "./client";
import axiosRetry from "axios-retry"; // библиотека для автоматических повторных попыток запросов

// Настраиваем axiosRetry для apiClient
axiosRetry(apiClient, {
  retries: 3, // Количество повторных попыток
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Увеличивающийся интервал (1с, 2с, 3с)
  },
  retryCondition: (error) => {
    // Повторяем запрос при сетевых ошибках и при 5xx ошибках сервера
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500)
    );
  },
});

/**
 * Получает список участников комнаты
 * @param {string} roomId - ID комнаты
 * @returns {Promise} - Промис с результатом запроса и списком участников
 */
export const getRoomParticipants = async (roomId) => {
  try {
    const response = await apiClient.get(`Rooms/${roomId}`);
    return response.room.participants;
  } catch (error) {
    console.error("Ошибка при получении участников комнаты:", error);
    throw error;
  }
};

/**
 * Проверяет, является ли пользователь участником комнаты
 * @param {string} roomId - ID комнаты
 * @param {string} userId - ID пользователя для проверки
 * @returns {Promise<boolean>} - Промис с результатом проверки
 */
export const isUserInRoom = async (roomId, userId) => {
  try {
    const participants = await getRoomParticipants(roomId);
    return participants.some((p) => p.userId === userId);
  } catch (error) {
    console.error("Ошибка при проверке наличия пользователя в комнате:", error);
    return false;
  }
};

/**
 * Удаляет участника из комнаты с учетом попыток переподключения удаленного пользователя библиотекой SignalR
 * @param {string} roomId - ID комнаты
 * @param {string} userId - ID удаляемого участника
 * @returns {Promise} - Промис с результатом запроса
 */
export const removeParticipant = async (roomId, userId) => {
  console.log(
    `[УДАЛЕНИЕ] Начинаю удаление пользователя ${userId} из комнаты ${roomId}`
  );

  // Принудительно удаляем все соединения SignalR для удаляемого пользователя
  try {
    await apiClient.post(`Rooms/${roomId}/forceDisconnect/${userId}`, {
      reason: "Admin kicked user",
    });
    console.log(
      `[УДАЛЕНИЕ] Отправлен запрос на принудительное отключение SignalR`
    );
  } catch (error) {
    console.warn(
      `[УДАЛЕНИЕ] Не удалось принудительно отключить соединения:`,
      error
    );
    // Продолжаем удаление несмотря на эту ошибку
  }

  // Итеративный процесс удаления с несколькими попытками
  let attempt = 0;
  const MAX_ATTEMPTS = 5;
  let lastError = null;
  let removed = false;

  while (attempt < MAX_ATTEMPTS && !removed) {
    attempt++;
    console.log(`[УДАЛЕНИЕ] Попытка #${attempt} из ${MAX_ATTEMPTS}`);

    try {
      // Проверяем, находится ли пользователь в комнате перед удалением
      const exists = await isUserInRoom(roomId, userId);
      if (!exists) {
        console.log(
          `[УДАЛЕНИЕ] Пользователь ${userId} не найден в комнате, удаление не требуется`
        );
        return {
          message: "Пользователь успешно удален из комнаты",
          removedUserId: userId,
        };
      }

      // Отправляем запрос на удаление с уникальным временным штампом для избежания кэширования
      const timestamp = new Date().getTime();
      const response = await apiClient.delete(
        `Rooms/${roomId}/participants/${userId}?t=${timestamp}`,
        {
          timeout: 10000, // Увеличиваем таймаут до 10 секунд
          headers: {
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
            "X-Attempt": attempt,
            "X-Force-Remove": "true",
          },
        }
      );

      console.log(`[УДАЛЕНИЕ] Сервер вернул успешный ответ:`, response);

      // Ждем 1.5 секунды перед проверкой результата
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Проверяем, действительно ли пользователь был удален
      const stillExists = await isUserInRoom(roomId, userId);

      if (!stillExists) {
        console.log(
          `[УДАЛЕНИЕ] Проверка подтвердила: пользователь ${userId} успешно удален`
        );
        removed = true;

        // Для надежности выполняем еще одну попытку удаления
        try {
          await apiClient.delete(
            `Rooms/${roomId}/participants/${userId}?final=true`
          );
          console.log(
            `[УДАЛЕНИЕ] Отправлен финальный запрос на удаление для гарантии`
          );
        } catch (e) {
          console.log(
            `[УДАЛЕНИЕ] Финальный запрос завершился с ошибкой (ожидаемо):`,
            e.message
          );
        }

        return response;
      } else {
        console.warn(
          `[УДАЛЕНИЕ] Пользователь ${userId} все еще в комнате несмотря на успешный ответ сервера!`
        );
        lastError = new Error(
          "Сервер вернул успешный ответ, но пользователь не был удален"
        );

        // Ждем перед следующей попыткой
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    } catch (error) {
      console.error(`[УДАЛЕНИЕ] Ошибка в попытке #${attempt}:`, error);
      lastError = error;

      // Проверяем, не был ли пользователь удален несмотря на ошибку
      try {
        const stillExists = await isUserInRoom(roomId, userId);
        if (!stillExists) {
          console.log(
            `[УДАЛЕНИЕ] Пользователь ${userId} удален несмотря на ошибку запроса`
          );
          removed = true;
          return {
            message: "Пользователь успешно удален из комнаты",
            removedUserId: userId,
          };
        }
      } catch (e) {
        console.warn(
          `[УДАЛЕНИЕ] Ошибка при проверке после неудачной попытки:`,
          e
        );
      }

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  if (!removed) {
    console.error(`[УДАЛЕНИЕ] Все ${MAX_ATTEMPTS} попыток удаления не удались`);
    if (lastError) {
      throw lastError;
    } else {
      throw new Error(
        `Не удалось удалить пользователя после ${MAX_ATTEMPTS} попыток`
      );
    }
  }

  // Этот код никогда не должен выполниться, но оставляем для безопасности
  return { message: "Пользователь удален из комнаты", removedUserId: userId };
};
