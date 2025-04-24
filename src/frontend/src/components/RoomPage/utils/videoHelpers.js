/* Регулярное выражение для всех форматов YouTube
https://youtube.com/watch?v=ID
https://www.youtube.com/watch?v=ID
https://youtu.be/ID
youtube.com/shorts/ID
*/
export const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Проверяет, является ли URL корректной ссылкой на видео YouTube
 * @param {string} url - URL для проверки
 * @returns {boolean} - Результат проверки
 */
export const isValidYouTubeUrl = (url) => {
  if (!url) return false;
  const match = url.match(YOUTUBE_REGEX);
  return match && match[1] && match[1].length === 11;
};

/**
 * Извлекает ID видео из YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - ID видео или null, если URL некорректный
 */
export const extractYouTubeVideoId = (url) => {
  if (!url) return null;
  const match = url.match(YOUTUBE_REGEX);
  return match && match[1] ? match[1] : null;
};

/**
 * Рассчитывает позицию и время при перемотке видео
 * @param {MouseEvent} e - Событие мыши
 * @param {HTMLElement} container - Контейнер с видео
 * @param {number} duration - Длительность видео в секундах
 * @returns {Object} - Объект с рассчитанными значениями
 */
export const calculateSeekPosition = (e, container, duration) => {
  if (!container || !duration) return { isValid: false };

  const progressBar =
    container.querySelector?.(".player-progress-bar") ||
    container
      .closest?.(".progress-bar-wrapper")
      ?.querySelector(".player-progress-bar");

  if (!progressBar) return { isValid: false };

  // Получаем размеры и позицию полосы прогресса
  const barRect = progressBar.getBoundingClientRect(); // getBoundingClientRect() - возвращает размеры и позицию элемента относительно окна браузера
  if (!barRect || barRect.width === 0) return { isValid: false };

  // Вычисляем позицию курсора относительно полосы прогресса
  // barRect.left - координата левой границы полосы прогресса относительно окна браузера
  // e.clientX - координата курсора по горизонтали относительно окна браузера
  // offsetX - расстояние между курсором и левой границей полосы прогресса
  let offsetX = e.clientX - barRect.left;
  if (isNaN(offsetX) || !isFinite(offsetX)) return { isValid: false };

  // Ограничиваем значения допустимым диапазоном
  offsetX = Math.max(0, Math.min(offsetX, barRect.width)); // ограничивает значение offsetX диапазоном от [0 до barRect.width]

  // Рассчитываем процент и время
  const percentage = offsetX / barRect.width; // рассчитывает процент от общей ширины полосы прогресса
  if (isNaN(percentage) || !isFinite(percentage)) return { isValid: false };

  const exactTime = percentage * duration; // рассчитывает точное время в секундах, соответствующее проценту от общей длительности видео
  if (isNaN(exactTime) || !isFinite(exactTime)) return { isValid: false };

  return {
    offsetX,
    percentage,
    exactTime,
    isValid: true,
  };
};
