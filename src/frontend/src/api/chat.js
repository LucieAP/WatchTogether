import * as signalR from "@microsoft/signalr";

export const createConnection = (
  roomId,
  onMessageReceived,
  onParticipantsUpdated
) => {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7143/chatHub", {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect()
    .build();

  connection.on("ReceiveMessage", (userId, userName, message) => {
    onMessageReceived({ userId, userName, message });
  });

  connection.on("ParticipantsUpdated", () => {
    onParticipantsUpdated();
  });

  const start = async () => {
    try {
      await connection.start();
      await connection.invoke("JoinRoom", roomId);
    } catch (err) {
      console.error("SignalR Connection Error:", err);
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
