// media.js

import * as signalR from "@microsoft/signalr";

export const createConnection = (
  roomId,
  onMessageReceived,
  onParticipantsUpdated,
  onHistoryReceived,
  username,
  userId,
  onVideoStateUpdated,
  onConnectionStateChanged // колбэк для отслеживания состояния соединения
) => {
  // Настраиваем параметры автоматического переподключения
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7143/mediaHub", {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .configureLogging(signalR.LogLevel.Information)
    // Конфигурация автоматического переподключения с экспоненциальной задержкой
    // Когда соединение с SignalR хабом разрывается, клиент будет автоматически пытаться восстановить соединение
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        // retryContext - объект, содержащий информацию о текущей попытке переподключения, включая:
        // previousRetryCount - количество уже выполненных попыток переподключения
        // Если все попытки исчерпаны, вызывает onclose

        // Максимально 5 попыток с экспоненциальной задержкой
        if (retryContext.previousRetryCount >= 5) return null;
        return Math.min(retryContext.previousRetryCount * 2000, 15000); // 0, 2с, 4с, 6с, 8с, но не более 15с
      },
    })
    .build();

  // Обработчик получения сообщения от сервера
  connection.on("ReceiveMessage", (userId, userName, message) => {
    // Обрабатываем системные сообщения
    const isSystemMessage = userId === "System";

    // Передает полученное сообщение в функцию onMessageReceived
    onMessageReceived({
      userId: isSystemMessage ? null : userId,
      userName,
      message,
      isSystem: isSystemMessage,
      timestamp: new Date(), // Текущее время для новых сообщений
    });
  });

  // Обработчик получения истории сообщений
  connection.on("ReceiveChatHistory", (history) => {
    onHistoryReceived(history);
  });

  // Обработчик обновления списка участников
  connection.on("ParticipantsUpdated", () => {
    onParticipantsUpdated();
  });

  // Обработчик удаления участника
  connection.on("ParticipantRemoved", (removedUserId, removedUserName) => {
    console.log(
      "Получено событие ParticipantRemoved для пользователя:",
      removedUserId
    );

    // Проверяем, является ли текущий пользователь удаленным
    if (removedUserId === userId) {
      console.log(
        "Текущий пользователь был удален из комнаты, перенаправление на главную страницу"
      );

      // Отправляем системное сообщение
      onMessageReceived({
        userId: null,
        userName: "System",
        message: "Вы были удалены из комнаты администратором",
        isSystem: true,
        timestamp: new Date(),
      });

      // Устанавливаем флаг в sessionStorage, чтобы предотвратить возврат в комнату
      sessionStorage.setItem("userRemoved", "true");
      sessionStorage.setItem("removedFromRoom", roomId);

      // Перенаправляем на главную страницу
      // Используем replace вместо href, чтобы предотвратить возможность вернуться назад
      window.location.replace("/");
    } else {
      // Для всех остальных участников отображаем сообщение о том, что пользователь был исключен
      onMessageReceived({
        userId: null,
        userName: "System",
        message: `Пользователь ${removedUserName} был исключен из комнаты администратором`,
        isSystem: true,
        timestamp: new Date(),
      });
    }
  });

  // Обработчик выхода пользователя из комнаты
  connection.on("UserLeft", (leftUserId, leftUserName) => {
    console.log("Получено событие UserLeft для пользователя:", leftUserId);

    // Отображаем системное сообщение о выходе пользователя
    onMessageReceived({
      userId: null,
      userName: "System",
      message: `Пользователь ${leftUserName} покинул комнату`,
      isSystem: true,
      timestamp: new Date(),
    });
  });

  // Обработчик получения начального состояния видео
  connection.on("InitialVideoState", (videoState) => {
    onVideoStateUpdated(videoState);
  });

  // Обработчик обновлений состояний видео
  connection.on("VideoStateUpdated", (videoState) => {
    onVideoStateUpdated(videoState);
  });

  // Обработчик события переподключения
  connection.onreconnecting((error) => {
    console.warn(`SignalR reconnecting (attempt ${connection.state})`, error);

    // Оповещаем UI о попытке переподключения
    if (onConnectionStateChanged) {
      onConnectionStateChanged("reconnecting", error);
    }

    onMessageReceived({
      userId: null,
      userName: "System",
      message: `Соединение потеряно. Выполняется переподключение...`,
      isSystem: true,
      timestamp: new Date(),
    });
  });

  // Обработчик события успешного переподключения
  connection.onreconnected((connectionId) => {
    console.log(
      "SignalR reconnected successfully. ConnectionId:",
      connectionId
    );

    // Оповещаем UI о успешном переподключении
    if (onConnectionStateChanged) {
      onConnectionStateChanged("connected", null);
    }

    // Повторно присоединяемся к комнате после переподключения
    connection
      .invoke("JoinRoom", roomId, username, userId)
      .then(() => {
        console.log("Rejoined room after reconnection");
        // Системное сообщение о успешном переподключении
        onMessageReceived({
          userId: null,
          userName: "System",
          message: "Соединение восстановлено",
          isSystem: true,
          timestamp: new Date(),
        });
      })
      .catch((err) =>
        console.error("Error rejoining room after reconnection:", err)
      );
  });

  // Обработчик события закрытия соединения
  connection.onclose((error) => {
    console.error("SignalR connection closed", error);
    // Оповещаем UI о закрытии соединения
    if (onConnectionStateChanged) {
      onConnectionStateChanged("disconnected", error);
    }

    // Если соединение полностью закрыто (после всех попыток переподключения)
    onMessageReceived({
      userId: null,
      userName: "System",
      message: "Соединение закрыто. Пожалуйста, перезагрузите страницу.",
      isSystem: true,
      timestamp: new Date(),
    });
  });

  // Обработчик события закрытия комнаты
  connection.on("RoomClosed", (message) => {
    console.log("Комната закрыта:", message);

    // Отображаем системное сообщение о закрытии комнаты
    onMessageReceived({
      userId: null,
      userName: "System",
      message: message,
      isSystem: true,
      timestamp: new Date(),
    });

    // Перенаправляем пользователя на главную страницу
    setTimeout(() => {
      window.location.replace("/");
    }, 3000); // Даем 3 секунды, чтобы пользователь увидел сообщение
  });

  const start = async () => {
    try {
      // Проверяем состояние соединения перед запуском
      if (connection.state === signalR.HubConnectionState.Disconnected) {
        // Проверяем, не идет ли уже процесс запуска соединения
        if (connection._startPromise) {
          console.log("Соединение уже в процессе запуска, ожидаем...");
          try {
            await connection._startPromise;
            console.log("Ожидающий запуск завершен");
            return;
          } catch (e) {
            console.warn(
              "Ожидающий запуск завершился с ошибкой, пробуем заново",
              e
            );
          }
        }

        // Сохраняем promise запуска, чтобы можно было отследить состояние
        connection._startPromise = connection.start();

        try {
          await connection._startPromise;
          console.log("SignalR connected. State:", connection.state);

          // Оповещаем UI о подключении
          if (onConnectionStateChanged) {
            onConnectionStateChanged("connected", null);
          }

          // Вызываем JoinRoom только после успешного подключения
          if (connection.state === signalR.HubConnectionState.Connected) {
            await connection
              .invoke("JoinRoom", roomId, username, userId)
              .catch((err) => {
                console.error("JoinRoom error:", err);
              });
          }
        } finally {
          // Очищаем сохраненный promise после завершения
          connection._startPromise = null;
        }
      }
    } catch (err) {
      console.error("SignalR Connection Error:", err);

      // Оповещаем UI об ошибке
      if (onConnectionStateChanged) {
        onConnectionStateChanged("error", err);
      }

      // Останавливаем соединение перед повторной попыткой, только если оно не в состоянии Disconnected
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        try {
          await connection.stop();
        } catch (stopErr) {
          console.warn("Ошибка при остановке соединения:", stopErr);
          // Игнорируем ошибку остановки, так как это не критично
        }
      }

      // Очищаем сохраненный promise в случае ошибки
      connection._startPromise = null;
    }
  };

  const sendMessage = async (roomId, userId, userName, message) => {
    try {
      // Проверяем состояние соединения перед отправкой
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke(
          "SendMessage",
          roomId,
          userId,
          userName,
          message
        );
      } else {
        console.warn("Cannot send message: SignalR connection not established");
        // Сохраняем сообщение для отправки после переподключения
        onMessageReceived({
          userId,
          userName,
          message,
          isSystem: false,
          timestamp: new Date(),
          pending: true, // Флаг для отображения состояния отправки
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Обработка неудачной отправки
      onMessageReceived({
        userId,
        userName,
        message,
        isSystem: false,
        timestamp: new Date(),
        error: true, // Флаг для отображения ошибки
      });
    }
  };

  // Проверка состояния соединения
  const checkConnection = () => {
    return connection.state === signalR.HubConnectionState.Connected;
  };

  // Ручное переподключение
  const reconnect = async () => {
    try {
      // Проверяем текущее состояние соединения
      if (connection.state !== signalR.HubConnectionState.Connected) {
        // Если соединение не в состоянии Disconnected, останавливаем его
        if (connection.state !== signalR.HubConnectionState.Disconnected) {
          try {
            await connection.stop();
            console.log("Соединение остановлено перед переподключением");
          } catch (stopErr) {
            console.warn("Ошибка при остановке соединения:", stopErr);
            // Игнорируем ошибку остановки, так как сейчас пытаемся переподключиться
          }
        }

        // Проверяем, что соединение действительно остановлено перед повторным запуском
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          console.log("Попытка переподключения...");
          return start();
        } else {
          console.warn(
            `Переподключение отменено: неожиданное состояние ${connection.state}`
          );
        }
      } else {
        console.log("Соединение уже активно, переподключение не требуется");
      }
    } catch (err) {
      console.error("Ошибка в процессе переподключения:", err);
      // Оповещаем UI об ошибке
      if (onConnectionStateChanged) {
        onConnectionStateChanged("error", err);
      }
    }
    return Promise.resolve();
  };

  return { connection, start, sendMessage, checkConnection, reconnect };
};
