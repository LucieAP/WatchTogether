// hooks/useRoomData.js
import { useState, useEffect } from "react";
import axios from "axios";

export const useRoomData = (roomId) => {
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoomData = async () => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/Rooms/${roomId}`);
      setRoomData(response.data.room);

      console.log("GET запрос к /api/Rooms/${roomId}: ", response.data);

      setError(null);
    } catch (err) {
      setError(err.message);
      setRoomData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  console.log("useRoomData roomData: ", roomData);

  return { roomData, isLoading, error, refetch: fetchRoomData };
};
