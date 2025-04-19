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
