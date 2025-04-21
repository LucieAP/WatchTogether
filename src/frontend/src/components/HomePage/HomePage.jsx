import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getPublicRooms, getUserRooms, deleteRoom } from "../../api/rooms";
import { handleManualLeave } from "../../api/leaveRoomAction";
import { useAuth } from "../../context/AuthContext";
import "./HomePage.css"; // Импортируем файл стилей

// Форматирование даты (вынесено за компонент)
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const HomePage = () => {
  const navigate = useNavigate();
  const { userId } = useAuth(); // Получаем ID текущего пользователя из контекста авторизации
  const [publicRooms, setPublicRooms] = useState([]);
  const [userRooms, setUserRooms] = useState([]); // Комнаты пользователя
  const [loading, setLoading] = useState(true);
  const [userRoomsLoading, setUserRoomsLoading] = useState(true); // Загрузка комнат пользователя
  const [error, setError] = useState(null);
  const [userRoomsError, setUserRoomsError] = useState(null); // Ошибка загрузки комнат пользователя
  const [showModal, setShowModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null); // ID выбранной комнаты
  const [selectedRoom, setSelectedRoom] = useState(null); // Выбранная комната
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Модальное окно подтверждения действия
  const [confirmActionType, setConfirmActionType] = useState(null); // Действие для подтверждения (leave/delete)
  const [actionRoomId, setActionRoomId] = useState(null); // ID комнаты для действия
  const [actionRoom, setActionRoom] = useState(null); // Комната для действия

  console.log("Текущий пользователь:", userId);

  // Загрузка публичных комнат при монтировании компонента
  useEffect(() => {
    const fetchPublicRooms = async () => {
      try {
        setLoading(true);
        const response = await getPublicRooms();
        console.log("Ререндеринг страницы. Public rooms:", response);
        setPublicRooms(response);
      } catch (err) {
        console.error("Ошибка при загрузке публичных комнат:", err);
        setError("Не удалось загрузить публичные комнаты. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    };

    // Загрузка комнат, созданных пользователем
    const fetchUserRooms = async () => {
      try {
        setUserRoomsLoading(true);
        const response = await getUserRooms();
        console.log("Комнаты пользователя:", response);
        setUserRooms(response);
      } catch (err) {
        console.error("Ошибка при загрузке комнат пользователя:", err);
        setUserRoomsError(
          "Не удалось загрузить ваши комнаты. Попробуйте позже."
        );
      } finally {
        setUserRoomsLoading(false);
      }
    };

    fetchPublicRooms();
    fetchUserRooms();
  }, []);

  // Обработчик перенаправления на страницу с формой создания комнаты
  const handleCreateRoom = useCallback(() => {
    navigate("/create-room");
  }, [navigate]);

  // Обработчик перехода в комнату
  const handleJoinRoom = useCallback(
    (roomId) => {
      const room = publicRooms.find((r) => r.roomId === roomId);
      setSelectedRoom(room);
      setSelectedRoomId(roomId);
      setShowModal(true);
    },
    [publicRooms]
  );

  // Подтверждение входа в комнату
  const confirmJoinRoom = useCallback(() => {
    navigate(`/room/${selectedRoomId}`);
    setShowModal(false);
  }, [navigate, selectedRoomId]);

  // Отмена входа в комнату
  const cancelJoinRoom = useCallback(() => {
    setShowModal(false);
    setSelectedRoomId(null);
    setSelectedRoom(null);
  }, []);

  // Обработчик покидания комнаты
  const handleLeaveRoom = useCallback(
    (roomId) => {
      const room = userRooms.find((r) => r.roomId === roomId);
      console.log("Покидаемая комната:", room);
      setActionRoom(room);
      setActionRoomId(roomId);
      setConfirmActionType("leave");
      setShowConfirmModal(true);
    },
    [userRooms]
  );

  // Обработчик удаления комнаты
  const handleDeleteRoom = useCallback(
    (roomId) => {
      const room = userRooms.find((r) => r.roomId === roomId);
      console.log("Удаляемая комната:", room);
      setActionRoom(room);
      setActionRoomId(roomId);
      setConfirmActionType("delete");
      setShowConfirmModal(true);
    },
    [userRooms]
  );

  // Подтверждение действия (покидание или удаление комнаты)
  const handleConfirmAction = useCallback(async () => {
    try {
      if (confirmActionType === "leave") {
        // Используем пустой объект для connectionRef, так как мы не в комнате
        await handleManualLeave(actionRoomId, { current: null }, navigate);
        // Обновляем список комнат пользователя
        const updatedRooms = await getUserRooms();
        setUserRooms(updatedRooms);
      } else if (confirmActionType === "delete") {
        await deleteRoom(actionRoomId);
        // Обновляем список комнат пользователя
        const updatedRooms = await getUserRooms();
        setUserRooms(updatedRooms);
        // Обновляем список публичных комнат
        const updatedPublicRooms = await getPublicRooms();
        setPublicRooms(updatedPublicRooms);
      }
    } catch (err) {
      console.error(
        `Ошибка при ${
          confirmActionType === "leave" ? "покидании" : "удалении"
        } комнаты:`,
        err
      );
    } finally {
      setShowConfirmModal(false);
      setActionRoomId(null);
      setActionRoom(null);
      setConfirmActionType(null);
    }
  }, [confirmActionType, actionRoomId, navigate]);

  // Отмена действия
  const cancelAction = useCallback(() => {
    setShowConfirmModal(false);
    setActionRoomId(null);
    setActionRoom(null);
    setConfirmActionType(null);
  }, []);

  // Мемоизация рендеринга комнат пользователя
  const userRoomsSection = useMemo(() => {
    if (userRoomsLoading) {
      return <p className="loading">Загрузка ваших комнат...</p>;
    }

    if (userRoomsError) {
      return <p className="error">{userRoomsError}</p>;
    }

    if (userRooms.length === 0) {
      return <p>У вас пока нет комнат</p>;
    }

    return (
      <div className="roomsGrid">
        {userRooms.map((room) => (
          <div key={room.roomId} className="roomCard userRoomCard">
            <h3>{room.roomName}</h3>
            <p className="roomDescription">{room.description}</p>
            <div className="roomCardFooter">
              <span className="participantsCount">
                <i className="icon-user"></i> {room.participantsCount}
              </span>
              {room.currentVideoTitle && (
                <p className="currentVideo">Сейчас: {room.currentVideoTitle}</p>
              )}
              <span className="roomDate">
                Создана: {formatDate(room.createdAt)}
              </span>
            </div>
            <div className="roomActions">
              <button
                className="joinButton"
                onClick={() => navigate(`/room/${room.roomId}`)}
              >
                Войти
              </button>
              {room.createdByUserId === userId ? (
                <button
                  className="deleteButton"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoom(room.roomId);
                  }}
                >
                  Удалить
                </button>
              ) : (
                <button
                  className="leaveButton"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLeaveRoom(room.roomId);
                  }}
                >
                  Покинуть
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [
    userRooms,
    userRoomsLoading,
    userRoomsError,
    userId,
    navigate,
    handleDeleteRoom,
    handleLeaveRoom,
  ]);

  // Мемоизация рендеринга публичных комнат
  const publicRoomsSection = useMemo(() => {
    if (loading) {
      return <p className="loading">Загрузка комнат...</p>;
    }

    if (error) {
      return <p className="error">{error}</p>;
    }

    if (publicRooms.length === 0) {
      return <p>Публичных комнат пока нет. Создайте первую!</p>;
    }

    return (
      <div className="roomsGrid">
        {publicRooms.map((room) => (
          <div
            key={room.roomId}
            className="roomCard"
            onClick={() => handleJoinRoom(room.roomId)}
          >
            <h3>{room.roomName}</h3>
            <p className="roomDescription">{room.description}</p>
            <div className="roomCardFooter">
              <span className="participantsCount">
                <i className="icon-user"></i> {room.participantsCount}
              </span>
              {room.currentVideoTitle && (
                <p className="currentVideo">Сейчас: {room.currentVideoTitle}</p>
              )}
              <span className="roomCreator">
                Создатель: {room.createdByUsername}
              </span>
              <span className="roomDate">
                Создана: {formatDate(room.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [publicRooms, loading, error, handleJoinRoom]);

  return (
    <div className="homePageContainer">
      <div className="homePage">
        <h1 className="title">Watch Together</h1>
        <p className="description">
          Смотрите видео вместе с друзьями в реальном времени
        </p>

        <button onClick={handleCreateRoom} className="createRoomButton">
          Создать комнату
        </button>

        {/* Раздел с комнатами пользователя */}
        <div className="userRoomsSection">
          <h2>Мои комнаты</h2>
          {userRoomsSection}
        </div>

        <div className="publicRoomsSection">
          <h2>Публичные комнаты</h2>
          {publicRoomsSection}
        </div>
      </div>

      {/* Модальное окно предупреждения о входе в комнату */}
      {showModal && (
        <div className="modalOverlay" onClick={cancelJoinRoom}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <h3>Подключение к комнате</h3>
            {selectedRoom && (
              <div className="modalBody">
                <p>
                  Вы собираетесь присоединиться к комнате "
                  {selectedRoom.roomName}".
                </p>
                <p>Создатель: {selectedRoom.createdByUsername}</p>
                {selectedRoom.currentVideoTitle && (
                  <p>
                    Сейчас воспроизводится: {selectedRoom.currentVideoTitle}
                  </p>
                )}
                <p>Количество участников: {selectedRoom.participantsCount}</p>
                <p>Хотите продолжить?</p>
              </div>
            )}
            <div className="modalActions">
              <button className="cancelButton" onClick={cancelJoinRoom}>
                Отмена
              </button>
              <button className="confirmButton" onClick={confirmJoinRoom}>
                Присоединиться
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения действия (покидание/удаление комнаты) */}
      {showConfirmModal && (
        <div className="modalOverlay" onClick={cancelAction}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <h3>
              {confirmActionType === "leave"
                ? "Покинуть комнату"
                : "Удалить комнату"}
            </h3>
            {actionRoom && (
              <div className="modalBody">
                <p>
                  Вы уверены, что хотите{" "}
                  {confirmActionType === "leave" ? "покинуть" : "удалить"}{" "}
                  комнату "{actionRoom.roomName}"?
                </p>
                {confirmActionType === "delete" && (
                  <p className="warningText">
                    Это действие нельзя отменить. Все участники будут отключены
                    от комнаты.
                  </p>
                )}
              </div>
            )}
            <div className="modalActions">
              <button className="cancelButton" onClick={cancelAction}>
                Отмена
              </button>
              <button
                className={`confirmButton ${
                  confirmActionType === "delete" ? "dangerButton" : ""
                }`}
                onClick={handleConfirmAction}
              >
                {confirmActionType === "leave" ? "Покинуть" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
