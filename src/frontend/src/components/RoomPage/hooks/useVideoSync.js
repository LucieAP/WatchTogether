import { useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import axios from "axios";

export const useVideoSync = (roomId, roomData, setRoomData, playerRef) => {
  const isSeekingRef = useRef(false); // Отслеживает активную перемотку, блокируя отправку времени во избежание петель.
  const lastReportedTimeRef = useRef(0); // Хранит последнее отправленное время для контроля значительных изменений.
  const lastServerUpdateRef = useRef(0); // Фиксирует время последнего серверного обновления, предотвращая обработку слишком частых апдейтов

  // Добавляем новый ref для отслеживания последнего отправленного состояния паузы
  const lastPlayPauseActionRef = useRef(null);
  const lastPlayPauseTimeRef = useRef(null); // Время последнего действия
  const playPauseDebounceTimeoutRef = useRef(null);

  // В iframe api ютуба getCurrentTime() предоставляет данные примерно с интервалом в 250 миллисекунд – то есть около 4 раз в секунду
  // Отправляет время на сервер при каждом обновлении времени воспроизведения
  const handleTimeUpdate = useDebouncedCallback(async (seconds) => {
    console.log(
      `Вызвался метод handleTimeUpdate, обновляем на время: ${seconds} сек.`
    );

    console.log("roomData.isPaused:", roomData.isPaused);

    // Добавляем состояние последнего отправленного времени
    if (!roomData.isPaused && !isSeekingRef.current) {
      // Проверяем, достаточно ли значительное изменение
      const lastReportedTime = lastReportedTimeRef.current || 0;
      // Отправляем на сервер только при изменении > 3 секунд
      if (Math.abs(lastReportedTime - seconds) > 1) {
        // Отправляем только при воспроизведении
        try {
          const response = await axios.patch(`/api/rooms/${roomId}/player`, {
            currentTimeInSeconds: Math.floor(seconds),
          });
          lastReportedTimeRef.current = seconds;
          console.log("CurrentTime: ", response.data.currentTimeInSeconds);
        } catch (error) {
          console.error("Ошибка обновления времени:", error);
        }
      }
    }
  }, 1500); // Увеличиваем частоту отправки времени на сервер до 1500 мс (1.5 сек)

  // Обработчик управления плеером с добавленным debounce механизмом
  const handlePlayPause = async (action) => {
    // Отменяем предыдущий таймаут, если такой был
    if (playPauseDebounceTimeoutRef.current) {
      clearTimeout(playPauseDebounceTimeoutRef.current);
    }

    // Запоминаем последнее запрошенное действие
    lastPlayPauseActionRef.current = action;
    lastPlayPauseTimeRef.current = Date.now();

    console.log(
      `lastPlayPauseActionRef.current: ${lastPlayPauseActionRef.current}`
    );

    // Устанавливаем задержку перед отправкой на сервер
    playPauseDebounceTimeoutRef.current = setTimeout(async () => {
      // Проверяем, не изменилось ли действие с момента последнего запроса
      const isPaused = lastPlayPauseActionRef.current === "pause";

      try {
        // Обновляем локальное состояние немедленно для отзывчивости UI
        setRoomData((prev) => ({ ...prev, isPaused: isPaused }));

        // Затем отправляем запрос на сервер
        const response = await axios.patch(`/api/rooms/${roomId}/player`, {
          isPaused,
        });
        console.log("IsPaused: ", response.data.isPaused);
        console.log("response.data after Pause: ", response.data);

        // Очищаем наш таймаут после успешного выполнения
        playPauseDebounceTimeoutRef.current = null;

        // Сверяем локальное состояние с подтвержденным сервером
        if (response.data.isPaused !== isPaused) {
          console.log(
            "Состояние воспроизведения на сервере отличается от локального, синхронизируем"
          );
          setRoomData((prev) => ({
            ...prev,
            isPaused: response.data.isPaused,
          }));
        }
      } catch (error) {
        console.error("Ошибка синхронизации:", error);
        // В случае ошибки, запрашиваем актуальное состояние с сервера
        try {
          const currentState = await axios.get(`/api/rooms/${roomId}`);
          setRoomData((prev) => ({
            ...prev,
            isPaused: currentState.data.isPaused,
          }));
        } catch (secondError) {
          console.error(
            "Не удалось получить актуальное состояние:",
            secondError
          );
        }
      }
    }, 300); // Задержка 300мс для дебаунса множественных нажатий
  };

  // Обработчик обновления состояния видео пользователей
  // Получает обновления от сервера и может вызывать перемотку видео
  const handleVideoStateUpdated = (videoState) => {
    // Ранний возврат, если состояние видео равно null или не определено (предотвращает выполнение лишнего кода)
    if (!videoState) {
      console.warn("Получено обновление состояния пустого видео");
      return;
    }

    console.log("Получено обновление состояния видео:", videoState);

    const now = Date.now();
    // Игнорирует апдейты, приходящие чаще 2 секунд, стабилизируя синхронизацию, защита от перегрузки сервера
    if (now - lastServerUpdateRef.current < 2000) {
      console.log("Пропускаем обновление (слишком частое)");
      return;
    }
    lastServerUpdateRef.current = now;

    const player = playerRef.current;
    const currentTime = player?.getCurrentTime?.() || 0;
    const serverTime = videoState?.currentTime || 0;
    const timeDifference = serverTime - currentTime;

    // Проверяем, был ли недавно отправлен Play/Pause запрос (в течение последних 2 секунд)
    const hasRecentPlayPauseAction =
      lastPlayPauseTimeRef.current && now - lastPlayPauseTimeRef.current < 2000;

    // Если это состояние получено после недавнего действия, проверим, совпадает ли оно с нашим
    if (hasRecentPlayPauseAction) {
      const ourAction = lastPlayPauseActionRef.current;
      const ourIsPaused = ourAction === "pause";
      const serverIsPaused = videoState.isPaused ?? true;

      console.log(
        "Недавнее действие:",
        ourAction,
        "локальное isPaused:",
        ourIsPaused,
        "серверное isPaused:",
        serverIsPaused
      );

      // Если сервер вернул противоположное состояние, то другой участник, вероятно, изменил состояние
      if (ourIsPaused !== serverIsPaused) {
        console.log(
          "Обнаружен конфликт состояний, принимаем серверное состояние"
        );
        // Сбрасываем наш флаг последнего действия, так как мы принимаем состояние сервера
        lastPlayPauseTimeRef.current = null;
      }
    }

    console.log(
      `Синхронизация: локальное ${currentTime}, серверное ${serverTime}, разница ${timeDifference.toFixed(
        2
      )}с,`,
      `hasRecentPlayPauseAction: ${hasRecentPlayPauseAction}`
    );

    // Добавляем проверку на недавнюю ручную перемотку (5 секунд)
    const wasRecentlyManuallySeek =
      window.lastManualSeekTime && now - window.lastManualSeekTime < 5000;

    console.log("wasRecentlyManuallySeek: ", wasRecentlyManuallySeek);

    // Сначала обработать синхронизацию времени
    // Проверка на расскождение текущего времени на клиенте с серверным
    // Если разница больше 3 секунд (> 3), происходит принудительная перемотка (seekTo) к времени сервера
    // isSeekingRef: Блокирует синхронизацию во время перемотки, предотвращая конфликты. Сбрасывается через 2 секунды, давая время на стабилизацию

    if (player && !isSeekingRef.current && !wasRecentlyManuallySeek) {
      if (Math.abs(serverTime - currentTime) > 8) {
        console.log(
          `Большое расхождение (${timeDifference.toFixed(
            2
          )}с): применяем прямую перемотку с ${currentTime} на ${serverTime}`
        );
        isSeekingRef.current = true;

        player.seekTo(serverTime, "seconds");

        // Сбрасываем флаг перемотки через короткое время
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 2000);
      }
    }

    // Если изменение инициировано сервером, обновляем локальное состояние
    setRoomData((prev) => {
      // Создаем новый объект видео только если он отличается
      const newVideo = videoState.currentVideo
        ? {
            videoId: videoState.currentVideo.videoId,
            title: videoState.currentVideo.title,
            duration: videoState.currentVideo.durationInSeconds,
          }
        : null;

      // Проверка, действительно ли что-то изменилось, чтобы избежать ненужных обновлений состояния
      const videoIdChanged =
        prev.currentVideoId !== (videoState.currentVideoId || null);
      const isPausedChanged = prev.isPaused !== (videoState.isPaused ?? true);
      const timeChanged = prev.currentTime !== (videoState.currentTime || 0);
      const videoChanged =
        JSON.stringify(prev.currentVideo) !== JSON.stringify(newVideo);

      const shouldUpdatePauseState =
        isPausedChanged &&
        (!hasRecentPlayPauseAction ||
          (hasRecentPlayPauseAction &&
            (videoState.isPaused ?? true) !==
              (lastPlayPauseActionRef.current === "pause")));

      console.log(
        "isPausedChanged: ",
        isPausedChanged,
        "shouldUpdatePauseState:",
        shouldUpdatePauseState
      );

      // Обновляйте состояние только в том случае, если что-то изменилось
      if (
        videoIdChanged ||
        timeChanged ||
        videoChanged ||
        shouldUpdatePauseState
      ) {
        const newState = {
          ...prev,
          currentVideoId: videoState.currentVideoId || null,
          currentTime: videoState.currentTime || 0,
          currentVideo: newVideo,
        };
        // Обновляем состояние паузы только если нужно
        if (shouldUpdatePauseState) {
          newState.isPaused = videoState.isPaused ?? true;

          // Если мы принимаем серверное состояние паузы, которое отличается от нашего последнего действия,
          // нужно обновить наше локальное состояние и в плеере
          if (hasRecentPlayPauseAction) {
            const serverIsPaused = videoState.isPaused ?? true;
            if (player) {
              if (serverIsPaused) {
                player.pauseVideo?.();
                console.log(
                  "Плеер принудительно поставлен на паузу согласно серверу"
                );
              } else {
                player.playVideo?.();
                console.log("Плеер принудительно запущен согласно серверу");
              }
            }
          }
        }
        return newState;
      }
      // Вовзрат предыдущего состояния, если ничего не изменилось
      return prev;
    });
  };

  return { handleTimeUpdate, handlePlayPause, handleVideoStateUpdated };
};
