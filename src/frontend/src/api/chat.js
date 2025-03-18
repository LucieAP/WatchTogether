import * as signalR from "@microsoft/signalr";

export const createConnection = (
  roomId,
  onMessageReceived,
  onParticipantsUpdated,
  onHistoryReceived,
  onHistoryCleared,
  username,
  userId
) => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7143/chatHub", {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect()
    .build();

  // Обработчик получения сообщения
  connection.on("ReceiveMessage", (userId, userName, message) => {
    // Обрабатываем системные сообщения
    const isSystemMessage = userId === "System";

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

  // Обработчик очистки истории чата
  connection.on("ChatHistoryCleared", () => {
    onHistoryCleared();
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

  // Функция для очистки истории чата (опционально, для администраторов)
  const clearChatHistory = async (roomId, userId) => {
    try {
      await connection.invoke("ClearChatHistory", roomId, userId);
    } catch (err) {
      console.error("Error clearing chat history:", err);
    }
  };

  return { connection, start, sendMessage, clearChatHistory };
};
