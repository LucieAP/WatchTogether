// hooks/useRoomData.js
import { useState, useEffect } from "react";
import { getRoom } from "../api/rooms";

export const useRoomData = (roomId) => {
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;

      setIsLoading(true);
      try {
        const data = await getRoom(roomId);

        setRoomData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setRoomData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId]);

  return { roomData, isLoading, error };
};
