// hooks/useRoomData.js
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

export const useRoomData = (roomId) => {
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Мемоизация функции fetchRoomData с useCallback
  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/Rooms/${roomId}`);
      setRoomData(response.data.room);

      console.log("GET запрос к /api/Rooms/${roomId}: ", response.data);

      setError(null);
    } catch (err) {
      console.error("Ошибка при получении данных комнаты:", err);

      // Проверяем, является ли ошибка 404 Not Found (комната не найдена/удалена)
      if (err.response && err.response.status === 404) {
        setError({
          notFound: true,
          message: "Комната не найдена или была удалена",
        });
      } else {
        setError({ message: err.message });
      }

      setRoomData(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Запрос на получение данных комнаты при монтировании компонента
  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // Мемоизация возвращаемого объекта с результатами
  return useMemo(
    () => ({
      roomData,
      isLoading,
      error,
      refetch: fetchRoomData,
    }),
    [roomData, isLoading, error, fetchRoomData]
  );
};
