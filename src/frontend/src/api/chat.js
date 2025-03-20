import * as signalR from "@microsoft/signalr";

export const createConnection = (
  roomId,
  onMessageReceived,
  onParticipantsUpdated,
  onHistoryReceived,
  username,
  userId,
  onVideoStateUpdated
) => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7143/mediaHub", {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect()
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

  // Обработчик получения начального состояния видео
  connection.on("InitialVideoState", (videoState) => {
    onVideoStateUpdated(videoState);
  });

  // Обработчик обновлений состояний видео
  connection.on("VideoStateUpdated", (videoState) => {
    onVideoStateUpdated(videoState);
  });

  const start = async () => {
    try {
      // Проверяем состояние соединения перед запуском
      if (connection.state === signalR.HubConnectionState.Disconnected) {
        await connection.start();
        console.log("SignalR connected. State:", connection.state);

        // Вызываем JoinRoom только после успешного подключения
        await connection
          .invoke("JoinRoom", roomId, username, userId)
          .catch((err) => console.error("JoinRoom error:", err));
      }
    } catch (err) {
      console.error("SignalR Connection Error:", err);

      // Останавливаем соединение перед повторной попыткой
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        await connection.stop();
      }

      // Добавим автоматическую попытку переподключения через 5 секунд
      setTimeout(start, 5000);
    }
  };

  const sendMessage = async (roomId, userId, userName, message) => {
    try {
      await connection.invoke("SendMessage", roomId, userId, userName, message);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return { connection, start, sendMessage };
};
