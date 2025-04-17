// roomActions.js

import axios from "axios";

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

// Обработчик для автоматического выхода при закрытии вкладки/браузера
export const setupBrowserCloseHandler = (roomId, connectionRef) => {
  const handleBeforeUnload = (event) => {
    // Запись в localStorage о том, что обработчик был вызван
    // localStorage.setItem("browserCloseHandlerTriggered", Date.now().toString());
    // localStorage.setItem("browserCloseHandlerLeaveType", "1"); // BrowserClose

    // Пытаемся остановить SignalR соединение
    try {
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop();
      }
    } catch (e) {
      console.error("Error stopping connection on page unload:", e);
    }

    // Используем sendBeacon для надежной отправки данных перед выгрузкой страницы
    try {
      // JSON.stringify – это встроенная функция JS, которая преобразует объект или значение в строку JSON.
      const data = JSON.stringify({ leaveType: 1 }); // 1 - BrowserClose
      // blob - это встроенный объект JS, который представляет собой необработанные данные в виде двоичных объектов.
      // Он позволяет работать с данными, которые не являются строками или текстом.
      const blob = new Blob([data], { type: "application/json" }); // Создаем Blob из данных, Blob принимает массив данных и опции
      // Отправляем данные с помощью sendBeacon
      const success = navigator.sendBeacon(`/api/Rooms/${roomId}/leave`, blob);
      // if (success) {
      //   localStorage.setItem(
      //     "browserCloseHandlerSuccess",
      //     "sendBeacon succeeded"
      //   );
      // } else {
      //   // Если sendBeacon не удался, записываем это в localStorage
      //   localStorage.setItem("browserCloseHandlerError", "sendBeacon failed");
      // }
    } catch (e) {
      // localStorage.setItem("browserCloseHandlerError", e.toString());
      console.error("Error sending leave request on page unload:", e);
    }

    // Для некоторых браузеров нужно вернуть специальное сообщение
    event.preventDefault();
    event.returnValue = "";
    return "";
  };

  // Регистрируем обработчик события beforeunload
  // beforeunload - событие, которое срабатывает перед закрытием вкладки или окна браузера
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Возвращаем функцию отключения обработчика
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
};

// // Обработчик для выхода из-за таймаута неактивности
// export const handleTimeoutLeave = (roomId, connectionRef, navigate) => {
//   return leaveRoom(roomId, connectionRef, navigate, "Timeout");
// };

// // Обработчик для выхода из-за проблем с сетью
// export const handleNetworkDisconnect = (roomId, connectionRef) => {
//   return leaveRoom(roomId, connectionRef, null, "NetworkDisconnect");
// };
