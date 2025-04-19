/**
 * Форматирует время сообщения в формат часы:минуты
 * @param {Date|string|number} timestamp - Временная метка
 * @returns {string} - Отформатированное время
 */
// Функция для форматирования времени сообщения
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Преобразует историю сообщений чата в формат, используемый компонентом
 * @param {Array} history - История сообщений с сервера
 * @returns {Array} - Отформатированные сообщения
 */
export const formatChatHistory = (history) => {
  if (!Array.isArray(history)) return []; // Проверяем, является ли history массивом

  return history.map((msg) => ({
    id: msg.messageId || msg.timestamp + Math.random().toString(36).substr(2),
    userId: msg.userId === "System" ? null : msg.userId,
    userName: msg.userName,
    message: msg.message,
    isSystem: msg.userId === "System",
    timestamp: new Date(msg.timestamp),
  }));
};
