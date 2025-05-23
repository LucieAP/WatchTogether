/* Регулярное выражение для всех форматов YouTube
https://youtube.com/watch?v=ID
https://www.youtube.com/watch?v=ID
https://youtu.be/ID
youtube.com/shorts/ID
*/
export const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Регулярное выражение для ссылок на видео VK в различных форматах:
 * - https://vk.com/video{ownerId}_{videoId}
 * - https://vk.com/video_ext.php?oid={ownerId}&id={videoId}
 * - https://vkvideo.ru/video_ext.php?oid={ownerId}&id={videoId}
 */
export const VK_VIDEO_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:vk\.com\/(?:video(-?\d+)_(\d+)|video_ext\.php\?oid=(-?\d+)&id=(\d+))|vkvideo\.ru\/video_ext\.php\?oid=(-?\d+)&id=(\d+))/;

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
 * Проверяет, является ли URL корректной ссылкой на видео VK
 * @param {string} url - URL для проверки
 * @returns {boolean} - Результат проверки
 */
export const isValidVkVideoUrl = (url) => {
  if (!url) return false;
  return VK_VIDEO_REGEX.test(url); // проверяет, соответствует ли URL регулярному выражению VK_VIDEO_REGEX
};

/**
 * Проверяет, является ли URL корректной ссылкой на видео (YouTube или VK)
 * @param {string} url - URL для проверки
 * @returns {boolean} - Результат проверки
 */
export const isValidVideoUrl = (url) => {
  return isValidYouTubeUrl(url) || isValidVkVideoUrl(url);
};

/**
 * Определяет тип видео по URL
 * @param {string} url - URL видео
 * @returns {'youtube'|'vk'|null} - Тип видео или null, если URL некорректный
 */
export const getVideoType = (url) => {
  if (isValidYouTubeUrl(url)) return "youtube";
  if (isValidVkVideoUrl(url)) return "vk";
  return null;
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
 * Извлекает ID владельца (ownerId) и ID видео (videoId) из URL VK
 * @param {string} url - URL видео VK
 * @returns {Object|null} Объект с ownerId и videoId или null, если URL некорректный
 */
export const extractVkVideoParams = (url) => {
  if (!url) return null;

  const match = url.match(VK_VIDEO_REGEX);
  if (!match) return null;

  // Проверяем формат ссылки и извлекаем параметры
  const ownerId = match[1] || match[3] || match[5];
  const videoId = match[2] || match[4] || match[6];

  if (!ownerId || !videoId) return null;

  return {
    ownerId,
    videoId,
  };
};

/**
 * Преобразует любой формат ссылки на видео VK в стандартный формат для iframe
 * @param {string} url - URL видео VK в любом формате
 * @param {number} hd - Качество видео (1-4), по умолчанию 2 (480p)
 * @returns {string|null} Стандартизированный URL для iframe или null, если исходный URL некорректный
 */
export const getVkVideoEmbedUrl = (url, hd = 2) => {
  const params = extractVkVideoParams(url);
  if (!params) return null;

  return `https://vk.com/video_ext.php?oid=${params.ownerId}&id=${params.videoId}&hd=${hd}&js_api=1`;
};

// Добавим функцию для нормализации типа видео в числовое значение
export const normalizeVideoType = (typeValue) => {
  if (typeValue === 0 || typeValue === "0") return 0;
  if (typeValue === "youtube" || typeValue === "YouTube") return 0;
  if (typeValue === 1 || typeValue === "1") return 1;
  if (typeValue === "vk" || typeValue === "VK") return 1;
  // Возвращаем исходное значение, если не удалось нормализовать
  return typeValue;
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
