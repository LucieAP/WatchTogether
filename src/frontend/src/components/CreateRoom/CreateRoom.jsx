import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createRoom } from "../../api/rooms";

// Константа для общих атрибутов полей ввода
const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

export default function CreateRoom() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    roomName: "",
    description: "",
    status: 0, // 0 - приватная, 1 - публичная
  });

  // Деструктуризация для упрощения чтения кода
  const { roomName, description, status } = formData;

  // Обработчик изменения формы (динамически обновляет состояние формы)
  const handleChange = (e) => {
    const { name, value } = e.target;
    // prev - новый объект на основе предыдущего состояния, поверхностная копия, для поля `name` устанавливается новое значение
    setFormData((prev) => ({
      ...prev,
      [name]: name === "status" ? parseInt(value, 10) : value,
    }));
  };

  // Обработчик отправки
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const createdRoom = await createRoom(formData);
      console.log("Комната создана:", createdRoom);

      // Переходим на страницу комнаты
      navigate(`/room/${createdRoom.roomId}`);
    } catch (error) {
      setError(error.message || "Ошибка при создании комнаты");
      console.error("Ошибка создания комнаты:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wrapper">
      <div className="container mt-5">
        <h2 id="createNewRoom">Создать новую комнату</h2>
        <div className="card mt-4">
          <div className="card-body">
            {/*Ошибки отображаются в UI*/}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {/* onSubmit - событие перед отправкой формы после клика по кнопке или нажатия на Enter*/}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="roomName">Название комнаты:</label>
                <input
                  type="text"
                  id="roomName"
                  name="roomName"
                  className="form-control"
                  required
                  {...INPUT_PROPS}
                  value={roomName}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group mt-3">
                <label htmlFor="description">Описание:</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows="3"
                  required
                  {...INPUT_PROPS}
                  value={description}
                  onChange={handleChange}
                ></textarea>
              </div>
              <div className="form-group mt-3">
                <label htmlFor="roomType">Тип комнаты:</label>
                <select
                  id="roomType"
                  name="status"
                  className="form-control"
                  required
                  value={status}
                  onChange={handleChange}
                >
                  <option value="0">Приватная</option>
                  <option value="1">Публичная</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={isSubmitting} // Кнопка блокируется во время отправки формы
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    />
                    Создание...
                  </>
                ) : (
                  "Создать комнату"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
