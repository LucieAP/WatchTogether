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
      // Сначала получаем текущие данные о комнате, чтобы проверить права пользователя
      const currentRoomData = await getRoom(roomId);

      // Проверяем, имеет ли пользователь право изменять настройки
      const currentUserId = currentRoomData?.userId;
      const isPublicRoom = currentRoomData?.room?.status === "Public";
      const isCreator =
        currentUserId === currentRoomData?.room?.createdByUserId;
      const canControlVideo = currentRoomData?.room?.canControlVideo;

      // Если комната публичная и пользователь не создатель/ведущий
      if (isPublicRoom && !canControlVideo) {
        throw new Error(
          "В публичной комнате только ведущий может изменять настройки"
        );
      }

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

      // Показываем уведомление об ошибке пользователю
      if (
        error.message ===
        "В публичной комнате только ведущий может изменять настройки"
      ) {
        alert(error.message);
      } else {
        // Расширенная диагностика ошибок
        if (error.response) {
          console.error("Данные ответа сервера:", error.response.data);
          console.error("HTTP статус:", error.response.status);

          // Если пришла ошибка доступа от сервера
          if (error.response.status === 403) {
            alert("У вас нет прав для изменения настроек комнаты");
          } else {
            alert("Произошла ошибка при сохранении настроек комнаты");
          }
        } else {
          alert(
            "Не удалось сохранить настройки. Проверьте соединение с интернетом"
          );
        }
      }

      // Закрываем модальное окно настроек, так как операция не удалась
      onSettingsClose();
    }
  };

  return { handleSaveSettings };
}
