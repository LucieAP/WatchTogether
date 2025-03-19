import * as signalR from "@microsoft/signalr";

export const createConnection = (
  roomId,
  onMessageReceived,
  onParticipantsUpdated,
  onHistoryReceived,
  username,
  userId
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

  const start = async () => {
    try {
      await connection.start();
      await connection.invoke("JoinRoom", roomId, username, userId);
    } catch (err) {
      console.error("SignalR Connection Error:", err);
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
