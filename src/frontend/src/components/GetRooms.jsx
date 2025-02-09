import { useState } from "react";
import { useEffect } from "react";
import { getRooms } from "../api/rooms";

export default function GetRooms() {
  const [rooms, setRooms] = useState([]);

  // Вызываем при монтировании компонента
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await getRooms(); // <- Здесь происходит реальный запрос к API
        console.log("Полученные комнаты:", response); // <- Добавьте это
        setRooms(response);
      } catch (err) {
        console.log(err);
      }
    };

    fetchRooms();
  }, []);

  return (
    <div>
      {rooms.map((room) => (
        <div key={room.roomId}>{room.roomName}</div>
      ))}
    </div>
  );
}
