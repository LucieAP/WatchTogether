import axios from "axios";

// Глобальная ссылка на обработчик beforeunload
let beforeUnloadHandler = null;

/**
 * Функция для выхода из комнаты с поддержкой различных сценариев выхода
 * @param {string} roomId - Идентификатор комнаты
 * @param {Object} connectionRef - Ссылка на SignalR соединение
 * @param {Function} navigate - Функция для перенаправления пользователя
 * @param {string} leaveType - Тип выхода из комнаты (Manual, BrowserClose, Timeout, NetworkDisconnect)
 * @returns {Promise<void>}
 */
export const leaveRoom = async (
  roomId,
  connectionRef,
  navigate,
  leaveType = 0 // 0 - Manual leave, 1 - BrowserClose, 2 - Timeout, 3 - NetworkDisconnect
) => {
  try {
    // Сначала останавливаем SignalR соединение, если оно существует
    try {
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop();
      }
    } catch (e) {
      console.error("Error stopping connection on page unload:", e);
    }

    // Отправляем запрос на сервер о выходе из комнаты
    const response = await axios.post(`/api/Rooms/${roomId}/leave`, {
      leaveType: leaveType,
    });

    console.log("Leave room response:", response.data);

    // Перенаправляем пользователя на главную страницу после успешного выхода
    if (navigate) {
      navigate("/");
    }

    return response.data;
  } catch (error) {
    console.error("Error leaving room:", error);
    // Даже при ошибке пытаемся перенаправить пользователя
    if (navigate) {
      navigate("/");
    }
    throw error;
  }
};

// Обработчик для явного выхода из комнаты по кнопке
export const handleManualLeave = (roomId, connectionRef, navigate) => {
  return leaveRoom(roomId, connectionRef, navigate, 0); // 0 - Manual leave
};

// Удаляет обработчик beforeunload
export const removeBeforeUnloadHandler = () => {
  if (beforeUnloadHandler) {
    console.log("[LEAVE] Removing global beforeunload handler");
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    beforeUnloadHandler = null;
    return true;
  }

  // Дополнительный способ очистки - использовать прямую ссылку
  if (window.onbeforeunload) {
    console.log("[LEAVE] Removing window.onbeforeunload handler");
    window.onbeforeunload = null;
    return true;
  }

  return false;
};

// Обработчик для автоматического выхода при закрытии вкладки/браузера
export const setupBrowserCloseHandler = (roomId, connectionRef) => {
  // Сначала удаляем предыдущий обработчик, если он был
  removeBeforeUnloadHandler();

  // Создаем новый обработчик
  beforeUnloadHandler = (event) => {
    console.log("[LEAVE] beforeunload handler triggered");
    // Пытаемся остановить SignalR соединение
    try {
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop();
      }
    } catch (e) {
      console.error("[LEAVE] Error stopping connection on page unload:", e);
    }

    // Используем sendBeacon для надежной отправки данных перед выгрузкой страницы
    try {
      const data = JSON.stringify({ leaveType: 1 }); // 1 - BrowserClose
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon(`/api/Rooms/${roomId}/leave`, blob);
    } catch (e) {
      console.error("[LEAVE] Error sending leave request on page unload:", e);
    }

    // Для некоторых браузеров нужно вернуть специальное сообщение
    event.preventDefault();
    event.returnValue = "";
    return "";
  };

  // Регистрируем обработчик события beforeunload
  window.addEventListener("beforeunload", beforeUnloadHandler);

  // Возвращаем функцию отключения обработчика
  return () => {
    removeBeforeUnloadHandler();
  };
};

// Обработчик для выхода из-за проблем с сетью
export const handleNetworkDisconnect = (roomId, connectionRef) => {
  return leaveRoom(roomId, connectionRef, null, "NetworkDisconnect");
};

/**
 * Принудительно перенаправляет пользователя на главную страницу
 * @param {boolean} clearStorage - Очищать ли данные из sessionStorage
 */
export const forceRedirect = (clearStorage = false) => {
  // Удаляем обработчик beforeunload
  removeBeforeUnloadHandler();

  // По необходимости очищаем sessionStorage
  if (clearStorage) {
    // Сохраняем текущий userId
    const userId = sessionStorage.getItem("X-User-Id");

    // Очищаем все данные
    sessionStorage.clear();

    // Восстанавливаем userId, чтобы пользователь не потерял свою учетную запись
    if (userId) {
      sessionStorage.setItem("X-User-Id", userId);
    }
  }

  // Перенаправляем пользователя
  window.location.replace("/");
};

/**
 * Обработчик для случая, когда пользователя удаляют из комнаты
 * @param {string} roomId - Идентификатор комнаты
 * @param {Object} connectionRef - Ссылка на SignalR соединение
 * @param {Function} navigate - Функция для перенаправления пользователя
 * @returns {void}
 */
export const handleKickFromRoom = (roomId, connectionRef, navigate) => {
  try {
    console.log("[LEAVE] Начинаю обработку удаления из комнаты", roomId);

    // Отключаем обработчик beforeunload
    removeBeforeUnloadHandler();

    // Устанавливаем флаг, что удаление уже выполняется
    window.isBeingRemoved = true;

    // Останавливаем SignalR соединение
    if (connectionRef.current?.connection) {
      try {
        connectionRef.current.connection.stop();
        console.log("[LEAVE] SignalR соединение остановлено");
      } catch (error) {
        console.error("[LEAVE] Ошибка при остановке SignalR:", error);
      }
    }

    // Очищаем sessionStorage от данных этой комнаты
    sessionStorage.removeItem(`room_${roomId}_user`);
    sessionStorage.setItem("userRemoved", "true");
    sessionStorage.setItem("removedFromRoom", roomId);

    // Перенаправляем пользователя на главную страницу
    console.log("[LEAVE] Перенаправление на главную страницу");
    if (navigate) {
      navigate("/");
    } else {
      setTimeout(() => {
        window.location.replace("/");
      }, 100);
    }
  } catch (error) {
    console.error("[LEAVE] Ошибка при обработке удаления из комнаты:", error);
    // Даже при ошибке пытаемся перенаправить пользователя
    forceRedirect(true);
  }
};
