import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createRoom } from "../../api/rooms";

export default function CreateRoom() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roomName: "",
    description: "",
    status: 0, // 0 - приватная, 1 - публичная
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Отправляем данные через Axios
      const createdRoom = await createRoom({
        roomName: formData.roomName,
        description: formData.description,
        status: parseInt(formData.status), // Преобразуем в число
      });
      console.log("Комната создана:", createdRoom);

      // Переходим на страницу комнаты
      navigate(`/room/${createdRoom.roomId}`); // Предполагая, что сервер возвращает id созданной комнаты
    } catch (error) {
      console.error("Ошибка создания комнаты:", error.message);
    }
  };

  return (
    <div className="wrapper">
      <div className="container mt-5">
        <h2 id="createNewRoom">Создать новую комнату</h2>
        <div className="card mt-4">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="roomName">Название комнаты:</label>
                <input
                  type="text"
                  id="roomName"
                  className="form-control"
                  required
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={formData.roomName}
                  onChange={
                    (e) =>
                      setFormData({ ...formData, roomName: e.target.value }) // Меняем только roomName, не меняем остальные свойства (благодаря ...formData)
                  }
                />
              </div>

              <div className="form-group mt-3">
                <label htmlFor="description">Описание:</label>
                <textarea
                  id="description"
                  className="form-control"
                  rows="3"
                  required
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={formData.description}
                  onChange={
                    (e) =>
                      setFormData({ ...formData, description: e.target.value }) // Меняем только description, не меняем остальные свойства (благодаря ...formData)
                  }
                ></textarea>
              </div>

              <div className="form-group mt-3">
                <label htmlFor="roomType">Тип комнаты:</label>
                <select
                  id="roomType"
                  className="form-control"
                  required
                  value={formData.status}
                  onChange={
                    (e) => setFormData({ ...formData, status: e.target.value }) // Меняем только status, не меняем остальные свойства (благодаря ...formData)
                  }
                >
                  <option value="0">Приватная</option>
                  <option value="1">Публичная</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary mt-4">
                Создать комнату
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
