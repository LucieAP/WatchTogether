import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
      const response = await fetch("/api/Rooms/Create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: formData.roomName,
          description: formData.description,
          status: parseInt(formData.status), // Преобразуем в число
        }),
      });
      if (!response.ok) {
        throw new Error("Ошибка создания комнаты");
      }
      const data = await response.json();
      navigate(`/room/${data.roomId}`);
    } catch (error) {
      console.error("Error:", error);
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
                  onChange={(e) =>
                    setFormData({ ...formData, roomName: e.target.value })
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
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

// return (
//   <div className="wrapper">
//     <div className="container mt-5">
//       <h2 id="createNewRoom">Создать новую комнату</h2>
//       <div className="card mt-4">
//         <div className="card-body">
//           <div className="form-group">
//             <label htmlFor="roomName">Название комнаты:</label>
//             <input
//               type="text"
//               id="roomName"
//               className="form-control"
//               required
//               spellCheck="false"
//               autoCorrect="off"
//               autoCapitalize="none"
//             />
//           </div>

//           <div className="form-group mt-3">
//             <label htmlFor="description">Описание:</label>
//             <textarea
//               id="description"
//               className="form-control"
//               rows="3"
//               required
//               spellCheck="false"
//               autoCorrect="off"
//               autoCapitalize="none"
//             ></textarea>
//           </div>

//           <div className="form-group mt-3">
//             <label htmlFor="roomType">Тип комнаты:</label>
//             <select id="roomType" className="form-control" required>
//               <option value="0">Приватная</option>
//               <option value="1">Публичная</option>
//             </select>
//           </div>

//           <button className="btn btn-primary mt-4" id="createRoomBtn">
//             Создать комнату
//           </button>
//         </div>
//       </div>
//     </div>
//   </div>
// );
//}
