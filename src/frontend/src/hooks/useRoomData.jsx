// hooks/useRoomData.js
import { useState, useEffect } from "react";
import { getRoom } from "../api/rooms";
import axios from "axios";

export const useRoomData = (roomId) => {
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;

      setIsLoading(true);
      try {
        const response = await axios.get(`/api/Rooms/${roomId}`);

        setRoomData(response);
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
