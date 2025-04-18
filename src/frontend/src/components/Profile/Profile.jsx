import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../api/auth';
import { getUserRooms, deleteRoom, deleteAllUserRooms } from '../../api/rooms';
import './Profile.css';

const Profile = () => {
  const { isLoggedIn } = useAuth();
  const [userData, setUserData] = useState(null);
  const [userRooms, setUserRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteStatus, setDeleteStatus] = useState({ loading: false, error: null });
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', onConfirm: null });

  useEffect(() => {
    // Этот эффект срабатывает при монтировании компонента и при изменении значения isLoggedIn
    // Массив зависимостей [isLoggedIn] указывает, что эффект будет повторно выполнен,
    // когда статус авторизации пользователя изменится
    const fetchUserData = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await getCurrentUser();
        setUserData(data);
        console.log("userData", userData);
      } catch (error) {
        setError('Ошибка при загрузке профиля пользователя');
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

  }, [isLoggedIn]);

  // Получение списка комнат пользователя
  useEffect(() => {
    const fetchUserRooms = async () => {
      if (!isLoggedIn) return;

      try {
        const rooms = await getUserRooms();
        setUserRooms(rooms);
      } catch (error) {
        console.error('Ошибка при получении комнат пользователя:', error);
      }
    };

    fetchUserRooms();
  }, [isLoggedIn]);

  // Функция для отображения модального окна
  const showConfirmModal = (title, message, onConfirm) => {
    setModalData({ title, message, onConfirm });
    setShowModal(true);
  };

  // Функция удаления комнаты
  const handleDeleteRoom = async (roomId) => {
    showConfirmModal(
      'Удаление комнаты',
      'Вы уверены, что хотите удалить эту комнату?',
      async () => {
        setDeleteStatus({ loading: true, error: null });
        try {
          await deleteRoom(roomId); // DELETE: api/Rooms/{roomId}
          // Обновляем список комнат пользователя после удаления
          setUserRooms(userRooms.filter(room => room.roomId !== roomId));
          setDeleteStatus({ loading: false, error: null });
        } catch (error) {
          setDeleteStatus({ loading: false, error: error.message });
        }
      }
    );
  };

  // Функция удаления всех комнат
  const handleDeleteAllRooms = () => {
    if (userRooms.length === 0) return;
    
    showConfirmModal(
      'Удаление всех комнат',
      'Вы уверены, что хотите удалить все свои комнаты? Это действие невозможно отменить.',
      async () => {
        setDeleteStatus({ loading: true, error: null });
        try {
          await deleteAllUserRooms(); // DELETE: api/Rooms/DeleteAll
          setUserRooms([]);
          setDeleteStatus({ loading: false, error: null });
        } catch (error) {
          setDeleteStatus({ loading: false, error: error.message });
        }
      }
    );
  };

  if (loading) {
    return <div className="profile-container loading">Загрузка профиля...</div>;
  }

  if (error) {
    return <div className="profile-container error">{error}</div>;
  }

  if (!isLoggedIn || !userData) {
    return <div className="profile-container not-logged-in">Вы не авторизованы</div>;
  }

  return (
    <div className="profile-container">
      {/* Модальное окно подтверждения */}
      {showModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-content">
            <h3>{modalData.title}</h3>
            <p>{modalData.message}</p>
            <div className="profile-modal-actions">
              <button 
                className="profile-modal-btn profile-modal-confirm-btn" 
                onClick={() => {
                  modalData.onConfirm();
                  setShowModal(false);
                }}
              >
                Подтвердить
              </button>
              <button 
                className="profile-modal-btn profile-modal-cancel-btn" 
                onClick={() => setShowModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-card">
        <h2>Профиль пользователя</h2>
        <div className="profile-info">
          <div className="profile-avatar">
            {/* Заглушка для аватара - первая буква имени пользователя */}
            <div className="avatar-placeholder">
              {userData.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="profile-details">
            <p><strong>Имя пользователя:</strong> {userData.username}</p>
            <p><strong>ID пользователя:</strong> {userData.userId}</p>
            <p>
              <strong>Статус:</strong> 
              <span className={`status-badge ${userData.isAuthenticated ? 'online' : 'offline'}`}>
                {userData.isAuthenticated ? 'Онлайн' : 'Оффлайн'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Компонент для отображения комнат пользователя */}
      <div className="user-rooms-card">
        <div className="rooms-profile-header">
          <h3>Мои комнаты</h3>
          {userRooms.length > 0 && (
            <button 
              className="delete-all-rooms-btn" 
              onClick={handleDeleteAllRooms}
              disabled={deleteStatus.loading}
            >
              {deleteStatus.loading ? 'Удаление...' : 'Удалить все комнаты'}
            </button>
          )}
        </div>

        {userRooms.length === 0 ? (
          <p className="no-rooms-message">У вас пока нет созданных комнат</p>
        ) : (
          <div className="rooms-profile-list">
            {userRooms.map(room => (
              <div key={room.roomId} className="room-profile-item">
                <div className="room-profile-info">
                  <div className="room-profile-name">{room.roomName}</div>
                  <div className="room-profile-description">{room.description}</div>
                  <div className="room-profile-meta">
                    <span className="room-profile-participants-count">Участников: {room.participantsCount}</span>
                    {room.currentVideoTitle && (
                      <span className="room-profile-current-video">Видео: {room.currentVideoTitle}</span>
                    )}
                  </div>
                </div>
                <div className="room-profile-actions">
                  <a href={`/room/${room.roomId}`} className="room-profile-enter-room-btn">Войти</a>
                  <button 
                    className="room-profile-delete-room-btn" 
                    onClick={() => handleDeleteRoom(room.roomId)} 
                    disabled={deleteStatus.loading}
                  >
                    {deleteStatus.loading ? 'Удаление...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {deleteStatus.error && (
          <div className="room-profile-delete-error-message">
            Ошибка при удалении: {deleteStatus.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 