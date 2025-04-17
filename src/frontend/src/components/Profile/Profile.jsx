import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../api/auth';
import './Profile.css';

const Profile = () => {
  const { isLoggedIn } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    </div>
  );
};

export default Profile; 