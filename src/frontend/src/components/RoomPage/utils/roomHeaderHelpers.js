export const calculateTimeLeft = (expiresAt) => {
  const expirationTime = new Date(expiresAt);
  // const expirationTime = new Date("2025-04-28T22:05:43.159429Z");
  const now = new Date();
  const difference = expirationTime - now;

  // Если время истекло, устанавливаем таймер в 0
  if (difference <= 0) {
    return {
      timeLeft: "00:00:00",
      showWarning: false,
    };
  }

  // Расчет оставшегося времени
  const hours = Math.floor(difference / (1000 * 60 * 60))
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((difference % (1000 * 60)) / 1000)
    .toString()
    .padStart(2, "0");

  const timeLeft = `${hours}:${minutes}:${seconds}`;

  // Показываем предупреждение, если осталось меньше 5 минут
  const showWarning = difference <= 5 * 60 * 1000;

  return { timeLeft, showWarning };
};
