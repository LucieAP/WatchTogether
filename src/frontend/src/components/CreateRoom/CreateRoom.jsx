export default function CreateRoom() {
  return (
    <div className="wrapper">
      <div className="container mt-5">
        <h2 id="createNewRoom">Создать новую комнату</h2>
        <div className="card mt-4">
          <div className="card-body">
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
              ></textarea>
            </div>

            <div className="form-group mt-3">
              <label htmlFor="roomType">Тип комнаты:</label>
              <select id="roomType" className="form-control" required>
                <option value="0">Приватная</option>
                <option value="1">Публичная</option>
              </select>
            </div>

            <button className="btn btn-primary mt-4" id="createRoomBtn">
              Создать комнату
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
