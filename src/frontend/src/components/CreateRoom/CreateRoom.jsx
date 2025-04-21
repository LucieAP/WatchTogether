import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createRoom } from "../../api/rooms";
import { useAuth } from "../../context/AuthContext";

// Константа для общих атрибутов полей ввода
const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

export default function CreateRoom() {
  const navigate = useNavigate();
  const { isLoggedIn, userId } = useAuth();
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
      // Если пользователь не авторизован, создаем комнату для гостя
      const dataToSend = {
        ...formData,
        // Если пользователь гость, передаем признак гостевой комнаты
        isGuest: !isLoggedIn,
      };

      const createdRoom = await createRoom(dataToSend);
      console.log("Комната создана:", createdRoom);

      // Устанавливаем маркер только что созданной комнаты для всех пользователей
      sessionStorage.setItem("just_created_room", "true");

      // Переходим на страницу комнаты
      navigate(`/room/${createdRoom.roomId}`);
    } catch (error) {
      // Проверяем, содержит ли ошибка информацию о лимите комнат
      if (
        error.response &&
        error.response.data &&
        (error.response.data.message || error.response.data.Message)
      ) {
        setError(error.response.data.message || error.response.data.Message);
      } else {
        setError(error.message || "Ошибка при создании комнаты");
      }
      console.error("Ошибка создания комнаты:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wrapper">
      <div className="container mt-5">
        <h2 id="createNewRoom">Создать новую комнату</h2>
        {/* Информация о режиме работы */}
        {isLoggedIn ? (
          <div className="alert alert-info mt-3">
            <ul className="mt-2 mb-0">
              <li>
                В авторизованном режиме можно создать неограниченное количество
                комнат
              </li>
              <li>Время жизни комнаты - 24 часа</li>
            </ul>
          </div>
        ) : (
          <div className="alert alert-info mt-3">
            Вы создаете комнату как гость. Для сохранения и дополнительных
            возможностей рекомендуется <a href="/auth">авторизоваться</a>.
            <ul className="mt-2 mb-0">
              <li>В гостевом режиме можно создать только одну комнату</li>
              <li>Время жизни гостевой комнаты - 3 часа</li>
            </ul>
          </div>
        )}
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
                  autoComplete="off"
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
