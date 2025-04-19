import { getRoomParticipants } from "../../../api/participants";

export function useConnectionHandlers(
  roomId,
  setRoomData,
  handleNetworkDisconnect
) {
  // Обработчик изменения состояния соединения
  const handleConnectionStateChanged = (state, error) => {
    console.log(`Connection state changed to: ${state}`, error);

    // Дополнительная логика при изменении состояния
    if (state === "disconnected" && error) {
      // Пытаемся уведомить сервер о проблеме с сетью
      if (handleNetworkDisconnect) {
        handleNetworkDisconnect(roomId, connectionRef);
      }
    }
  };

  // Обработчик обновления пользователей
  const handleParticipantsUpdated = async () => {
    try {
      const participants = await getRoomParticipants(roomId);
      setRoomData((prev) => ({
        ...prev,
        participants,
      }));
      console.log("Обновлены участники комнаты:", participants);
    } catch (error) {
      console.error("Ошибка при обновлении участников:", error);
    }
  };

  return {
    handleConnectionStateChanged,
    handleParticipantsUpdated,
  };
}
