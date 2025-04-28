import { useState, useEffect } from "react";
import {
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
} from "../../api/health";
import "./HealthStatus.css";

/**
 * Компонент для отображения статуса сервера
 * @returns {JSX.Element} React компонент
 */
function HealthStatus() {
  const [healthData, setHealthData] = useState(null);
  const [livenessData, setLivenessData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAllHealth = async () => {
      try {
        setLoading(true);
        // Получаем все данные о здоровье системы
        const [healthResult, livenessResult, readinessResult] =
          await Promise.all([
            getHealthStatus(),
            getLivenessStatus(),
            getReadinessStatus(),
          ]);

        console.log("Детальный статус:", healthResult);
        console.log("Статус живучести:", livenessResult);
        console.log("Статус готовности:", readinessResult);

        // Обрабатываем результаты
        setHealthData(healthResult);
        setLivenessData(livenessResult);
        setReadinessData(readinessResult);

        // Проверяем на наличие ошибок
        if (healthResult?.error) {
          setError(`Ошибка при получении статуса: ${healthResult.error}`);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error("Ошибка запроса к API:", err);
        setError(
          err.message || "Произошла ошибка при получении статуса сервера"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllHealth();

    // Обновляем данные каждые 30 секунд
    const intervalId = setInterval(fetchAllHealth, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Определение цвета статуса
  const getStatusColor = (status) => {
    if (!status) return "var(--text-color, #333)";

    const statusLower = status.toLowerCase();

    switch (statusLower) {
      case "healthy":
        return "var(--success-color, #4caf50)";
      case "degraded":
        return "var(--warning-color, #ff9800)";
      case "unhealthy":
      case "error":
        return "var(--error-color, #f44336)";
      default:
        return "var(--text-color, #333)";
    }
  };

  const toggleExpand = () => setExpanded(!expanded);

  // Проверка на проблемы с маршрутизацией
  const isRoutingIssue =
    healthData?.status === "Error" ||
    (typeof healthData?.status === "string" &&
      healthData?.status.includes("<!DOCTYPE html>"));

  if (loading) {
    return (
      <div className="health-status-container loading">
        <p>Загрузка данных о статусе сервера...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-status-container error">
        <h3>Не удалось получить статус сервера</h3>
        <p>{error}</p>

        <div className="troubleshooting">
          <h4>Возможные причины проблемы:</h4>
          <ul>
            <li>Сервер не запущен или недоступен</li>
            <li>Эндпоинты health check настроены некорректно</li>
            <li>Проблемы с CORS или маршрутизацией на сервере</li>
          </ul>

          <h4>Что можно сделать:</h4>
          <ul>
            <li>Убедитесь, что сервер запущен и доступен</li>
            <li>Проверьте настройки CORS на сервере</li>
            <li>
              Убедитесь, что эндпоинты health check доступны по URL /api/health
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Если получили HTML вместо JSON
  if (isRoutingIssue) {
    return (
      <div className="health-status-container error">
        <h3>Проблема с маршрутизацией на сервере</h3>
        <p>
          Получен некорректный ответ от сервера. Проверьте настройку эндпоинтов
          health check.
        </p>

        <div className="troubleshooting">
          <h4>Вероятная причина:</h4>
          <p>
            Эндпоинты health check настроены с другим префиксом или
            маршрутизацией.
          </p>

          <h4>Рекомендации:</h4>
          <ol>
            <li>
              Убедитесь, что эндпоинты health check правильно настроены в
              Program.cs
            </li>
            <li>Проверьте, доступны ли эндпоинты по URL /api/health</li>
            <li>
              Если эндпоинты настроены по другому пути, обновите настройки в
              src/frontend/src/api/health.js
            </li>
          </ol>
        </div>
      </div>
    );
  }

  const statusValue =
    healthData?.status ||
    (livenessData?.status === "Healthy" ? "Healthy" : "Unknown");

  return (
    <div className="health-status-container">
      <div
        className="health-status-summary"
        onClick={toggleExpand}
        style={{ cursor: "pointer" }}
      >
        <div className="status-indicator">
          <span
            className="status-dot"
            style={{ backgroundColor: getStatusColor(statusValue) }}
          ></span>
          <h3>
            Статус сервера:{" "}
            <span style={{ color: getStatusColor(statusValue) }}>
              {statusValue}
            </span>
          </h3>
        </div>
        <button className="expand-button">
          {expanded ? "Свернуть" : "Подробнее"}
        </button>
      </div>

      {expanded && (
        <div className="health-status-details">
          <div className="health-overview">
            <div className="health-overview-item">
              <h4>Живучесть:</h4>
              <span style={{ color: getStatusColor(livenessData?.status) }}>
                {livenessData?.status || "Неизвестно"}
              </span>
            </div>
            <div className="health-overview-item">
              <h4>Готовность:</h4>
              <span style={{ color: getStatusColor(readinessData?.status) }}>
                {readinessData?.status || "Неизвестно"}
              </span>
            </div>
          </div>

          {healthData?.checks && (
            <>
              <h4>Детали проверок:</h4>
              <div className="checks-container">
                {healthData.checks.map((check, index) => (
                  <div key={index} className="check-item">
                    <div className="check-header">
                      <span
                        className="status-dot small"
                        style={{
                          backgroundColor: getStatusColor(check.status),
                        }}
                      ></span>
                      <span className="check-name">{check.name}</span>
                      <span
                        className="check-status"
                        style={{ color: getStatusColor(check.status) }}
                      >
                        {check.status}
                      </span>
                    </div>
                    {check.description && (
                      <p className="check-description">{check.description}</p>
                    )}
                    <p className="check-duration">
                      Время выполнения: {check.duration}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Отладочная информация */}
      {process.env.NODE_ENV === "development" && (
        <div className="health-debug">
          <details>
            <summary>Отладочная информация</summary>
            <h5>Health:</h5>
            <pre>{JSON.stringify(healthData, null, 2)}</pre>
            <h5>Liveness:</h5>
            <pre>{JSON.stringify(livenessData, null, 2)}</pre>
            <h5>Readiness:</h5>
            <pre>{JSON.stringify(readinessData, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default HealthStatus;
