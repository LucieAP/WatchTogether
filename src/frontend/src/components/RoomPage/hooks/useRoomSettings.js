import { updateRoom, getRoom } from "../../../api/rooms";

export function useRoomSettings(
  roomId,
  setRoomData,
  refetchRoomData,
  onSettingsClose
) {
  // Обработка сохранения изменений при настройке комнаты
  const handleSaveSettings = async (updatedData) => {
    try {
      const response = await updateRoom(roomId, {
        roomName: updatedData.roomName,
        description: updatedData.description,
      });

      // Получаем обновленные данные с сервера
      const updatedRoomResponse = await getRoom(roomId);

      setRoomData((prev) => ({
        ...prev,
        roomName: response.newRoomName,
        description: response.newDescription,
      }));

      console.log("Обновленные данные:", {
        name: response.newRoomName,
        desc: response.newDescription,
      });

      // Принудительно обновляем данные
      await refetchRoomData();

      onSettingsClose();
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", {
        message: error.message,
        fullError: error, // Выводим полный объект ошибки
      });
      // Расширенная диагностика ошибок
      if (error.response) {
        console.error("Данные ответа сервера:", error.response.data);
        console.error("HTTP статус:", error.response.status);
      }
    }
  };

  return { handleSaveSettings };
}
