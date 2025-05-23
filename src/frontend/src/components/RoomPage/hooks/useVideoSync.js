import { useRef, useMemo, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import * as signalR from "@microsoft/signalr";
import { normalizeVideoType } from "../utils/videoHelpers";

export const useVideoSync = (
  roomId,
  roomData,
  setRoomData,
  playerRef,
  connectionRef
) => {
  const isSeekingRef = useRef(false); // Отслеживает активную перемотку, блокируя отправку времени во избежание петель
  const lastReportedTimeRef = useRef(0); // Хранит последнее отправленное время для контроля значительных изменений
  const lastServerUpdateRef = useRef(0); // Фиксирует время последнего серверного обновления, предотвращая обработку слишком частых апдейтов

  // Добавляем новый ref для отслеживания последнего отправленного состояния паузы
  const lastPlayPauseActionRef = useRef(null);
  const lastPlayPauseTimeRef = useRef(null); // Время последнего действия
  const playPauseDebounceTimeoutRef = useRef(null);

  // Механизм контроля здоровья соединения
  const connectionHealthRef = useRef({
    lastPingTime: Date.now(),
    reconnectAttempts: 0,
  });

  // Отправляет время на сервер при каждом обновлении времени воспроизведения через SignalR
  const handleTimeUpdate = useDebouncedCallback(async (seconds) => {
    console.log(
      `Вызвался метод handleTimeUpdate, обновляем на время: ${seconds} сек.`
    );
    console.log("roomData.isPaused:", roomData.isPaused);

    // Если видео на паузе или идет перемотка - не отправляем обновления
    if (roomData.isPaused || isSeekingRef.current) return;

    console.log("window.lastManualSeekTime:", window.lastManualSeekTime);
    // Проверяем, была ли недавно ручная перемотка (в течение 5 секунд)
    const wasRecentlyManuallySeek =
      window.lastManualSeekTime &&
      Date.now() - window.lastManualSeekTime < 5000;

    // Добавляем состояние последнего отправленного времени
    // Проверяем, достаточно ли значительное изменение
    const lastReportedTime = lastReportedTimeRef.current || 0;

    // Для обычного обновления требуется разница > 1 секунды
    // Для случая после ручной перемотки - отправляем в любом случае
    if (wasRecentlyManuallySeek || Math.abs(lastReportedTime - seconds) > 1) {
      // Проверяем, активно ли соединение SignalR
      if (connectionRef.current?.connection?.state === "Connected") {
        try {
          // Используем SignalR для отправки обновления времени
          await connectionRef.current.connection.invoke(
            "UpdateVideoTime",
            roomId,
            Math.floor(seconds)
          );
          lastReportedTimeRef.current = seconds;
          console.log("SignalR отправка времени:", Math.floor(seconds));

          // Если это было обновление после ручной перемотки, обновляем метку времени
          if (wasRecentlyManuallySeek) {
            console.log("Успешно отправлено время после ручной перемотки");
            // Очищаем метку - синхронизация выполнена
            window.lastManualSeekTime = null;
          }
        } catch (error) {
          console.error("Ошибка отправки времени через SignalR:", error);
          checkConnectionHealth();
        }
      } else {
        console.warn("SignalR соединение недоступно для обновления времени");
        checkConnectionHealth();
      }
    }
  }, 1500);

  // Проверка и восстановление соединения при необходимости
  const checkConnectionHealth = () => {
    const now = Date.now();
    const timeSinceLastPing = now - connectionHealthRef.current.lastPingTime;

    if (timeSinceLastPing > 10000) {
      // 10 секунд без успешного взаимодействия
      console.warn("Возможно соединение нестабильно, проверяем...");

      // Проверка соединения и попытка переподключения при необходимости
      if (connectionRef.current?.connection?.state !== "Connected") {
        connectionRef.current.connection
          ?.start()
          .then(() => {
            console.log("SignalR соединение восстановлено");
            connectionHealthRef.current.lastPingTime = Date.now();
            connectionHealthRef.current.reconnectAttempts = 0;
          })
          .catch(() => {
            connectionHealthRef.current.reconnectAttempts++;
            console.error(
              `Не удалось восстановить соединение (попытка ${connectionHealthRef.current.reconnectAttempts})`
            );
          });
      }
    }
  };

  // Обработчик управления плеером с механизмом debounce
  const handlePlayPause = useMemo(
    () => async (action) => {
      // Отменяем предыдущий таймаут
      if (playPauseDebounceTimeoutRef.current) {
        clearTimeout(playPauseDebounceTimeoutRef.current);
      }

      // Запоминаем последнее запрошенное действие
      lastPlayPauseActionRef.current = action;
      lastPlayPauseTimeRef.current = Date.now();

      console.log(
        `lastPlayPauseActionRef.current: ${lastPlayPauseActionRef.current}`
      );

      // Получаем текущее время воспроизведения при постановке на паузу
      let currentPlayerTime = 0;
      if (action === "pause" && playerRef.current) {
        currentPlayerTime = playerRef.current.getCurrentTime?.() || 0;
        console.log(
          `Текущее время при постановке на паузу: ${currentPlayerTime} сек.`
        );
      }

      // Проверяем, была ли недавно ручная перемотка (в течение 5 секунд)
      const wasRecentlyManuallySeek =
        window.lastManualSeekTime &&
        Date.now() - window.lastManualSeekTime < 5000;

      // Если недавно была перемотка и мы снимаем с паузы, немедленно отправляем текущее время
      if (wasRecentlyManuallySeek && action === "play" && playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime?.() || 0;

        // Обновляем локальное состояние
        setRoomData((prev) => ({
          ...prev,
          currentTime,
          isPaused: false,
        }));

        console.log(`Снятие с паузы после перемотки на ${currentTime} сек.`);

        // Немедленно отправляем обновление времени на сервер
        if (connectionRef.current?.connection?.state === "Connected") {
          try {
            await connectionRef.current.connection.invoke(
              "UpdateVideoTime",
              roomId,
              Math.floor(currentTime)
            );
            lastReportedTimeRef.current = currentTime;
            console.log(
              `Отправлено время после перемотки и снятия с паузы: ${Math.floor(
                currentTime
              )} сек.`
            );
          } catch (error) {
            console.error(
              "Ошибка отправки времени после снятия с паузы:",
              error
            );
          }
        }
      }

      // Устанавливаем короткую задержку перед отправкой
      playPauseDebounceTimeoutRef.current = setTimeout(async () => {
        // Проверяем, не изменилось ли действие с момента последнего запроса
        const isPaused = lastPlayPauseActionRef.current === "pause";

        try {
          // Немедленно обновляем локальное состояние для отзывчивости UI
          setRoomData((prev) => ({
            ...prev,
            isPaused: isPaused,
            // Если ставим на паузу, сохраняем текущее время воспроизведения
            ...(isPaused && currentPlayerTime > 0
              ? { currentTime: currentPlayerTime }
              : {}),
          }));

          // Проверяем, активно ли соединение SignalR
          if (connectionRef.current?.connection?.state === "Connected") {
            // Отправляем состояние через SignalR
            await connectionRef.current.connection.invoke(
              "UpdateVideoPauseState",
              roomId,
              isPaused
            );
            console.log("SignalR отправка isPaused:", isPaused);

            // Если ставим на паузу, сразу отправляем и текущее время отдельным вызовом
            if (isPaused && currentPlayerTime > 0) {
              try {
                await connectionRef.current.connection.invoke(
                  "UpdateVideoTime",
                  roomId,
                  Math.floor(currentPlayerTime)
                );
                console.log(
                  `SignalR отправка времени при паузе: ${Math.floor(
                    currentPlayerTime
                  )}`
                );
                lastReportedTimeRef.current = currentPlayerTime;
              } catch (timeError) {
                console.error("Ошибка отправки времени при паузе:", timeError);
              }
            }

            connectionHealthRef.current.lastPingTime = Date.now(); // Обновление времени последней успешной коммуникации
          } else {
            console.warn(
              "SignalR соединение недоступно для обновления состояния паузы"
            );
            checkConnectionHealth();
          }

          // Очищаем наш таймаут после успешного выполнения
          playPauseDebounceTimeoutRef.current = null;
        } catch (error) {
          console.error("Ошибка синхронизации через SignalR:", error);
          checkConnectionHealth();
        }
      }, 300); // Задержка 300мс для дебаунса множественных нажатий
    },
    [roomId, setRoomData, connectionRef, playerRef]
  );

  // Обработчик обновления состояния видео, получаемого через SignalR
  const handleVideoStateUpdated = useMemo(
    () => (videoState) => {
      // Ранний возврат, если состояние видео равно null или не определено
      if (!videoState) {
        console.warn("Получено обновление состояния пустого видео");
        return;
      }

      console.log(
        "Получено обновление состояния видео через SignalR:",
        videoState
      );
      connectionHealthRef.current.lastPingTime = Date.now(); // Обновляем время последней активности

      const now = Date.now();
      // Игнорирует апдейты, приходящие чаще 1 секунд, стабилизируя синхронизацию, защита от перегрузки сервера
      if (now - lastServerUpdateRef.current < 1000) {
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
        lastPlayPauseTimeRef.current &&
        now - lastPlayPauseTimeRef.current < 2000;

      console.log(
        `Синхронизация: локальное ${currentTime}, серверное ${serverTime}, разница ${timeDifference.toFixed(
          2
        )}с,`,
        `hasRecentPlayPauseAction: ${hasRecentPlayPauseAction}`
      );

      console.log("window.lastManualSeekTime:", window.lastManualSeekTime);
      // Проверяем, была ли недавно ручная перемотка (в течение 5 секунд)
      const wasRecentlyManuallySeek =
        window.lastManualSeekTime && now - window.lastManualSeekTime < 5000;

      console.log("wasRecentlyManuallySeek: ", wasRecentlyManuallySeek);

      // Если была ручная перемотка, но мы еще не отправили обновление на сервер,
      // делаем это немедленно - отправляем текущее время на сервер
      if (
        wasRecentlyManuallySeek &&
        player &&
        !roomData.isPaused &&
        connectionRef.current?.connection?.state === "Connected"
      ) {
        const currentPlayerTime = player.getCurrentTime?.() || 0;
        try {
          // Отправляем новое время на сервер сразу после ручной перемотки
          console.log(
            `Отправка времени после ручной перемотки: ${Math.floor(
              currentPlayerTime
            )} сек.`
          );
          connectionRef.current.connection.invoke(
            "UpdateVideoTime",
            roomId,
            Math.floor(currentPlayerTime)
          );
          lastReportedTimeRef.current = currentPlayerTime;
        } catch (error) {
          console.error("Ошибка отправки времени после перемотки:", error);
        }
      }

      // Сначала обработать синхронизацию времени
      // Проверка на расскождение текущего времени на клиенте с серверным
      // Если разница больше 5 секунд (> 5), происходит принудительная перемотка (seekTo) к времени сервера
      // isSeekingRef: Блокирует синхронизацию во время перемотки, предотвращая конфликты. Сбрасывается через 2 секунды, давая время на стабилизацию

      // Пропускаем принудительную синхронизацию при наличии недавних действий с плеером
      if (
        player &&
        !isSeekingRef.current &&
        !wasRecentlyManuallySeek &&
        !hasRecentPlayPauseAction
      ) {
        if (Math.abs(serverTime - currentTime) > 5) {
          console.log(
            `Большое расхождение (${timeDifference.toFixed(
              2
            )}с):\nСинхронизация: ${currentTime} → ${serverTime}`
          );
          isSeekingRef.current = true;

          player.seekTo(serverTime, "seconds");

          // Сбрасываем флаг перемотки через короткое время
          setTimeout(() => {
            isSeekingRef.current = false;
          }, 2000);
        }
      } else if (hasRecentPlayPauseAction) {
        console.log(
          "Пропускаем синхронизацию времени из-за недавнего play/pause действия"
        );
      }

      // Если изменение инициировано сервером, обновляем локальное состояние
      setRoomData((prev) => {
        // Создаем новый объект видео только если он отличается
        const newVideo = videoState.currentVideo
          ? {
              videoId: videoState.currentVideo.videoId,
              title: videoState.currentVideo.title,
              duration: videoState.currentVideo.durationInSeconds,
              // Нормализуем тип видео в числовое значение
              videoType: normalizeVideoType(videoState.currentVideo.videoType),
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
    },
    [playerRef, setRoomData]
  );

  // Обработчик получения начального состояния видео при присоединении к комнате
  const handleInitialVideoState = useMemo(
    () => (videoState) => {
      if (!videoState) {
        console.warn("Получено пустое начальное состояние видео");
        return;
      }

      console.log("Получено начальное состояние видео:", videoState);
      connectionHealthRef.current.lastPingTime = Date.now();

      // Создаем новый объект видео
      const newVideo = videoState.currentVideo
        ? {
            videoId: videoState.currentVideo.videoId,
            title: videoState.currentVideo.title,
            duration: videoState.currentVideo.durationInSeconds,
            videoType: normalizeVideoType(videoState.currentVideo.videoType),
          }
        : null;

      // Обновляем состояние комнаты с данными с сервера
      setRoomData((prev) => ({
        ...prev,
        currentVideoId: videoState.currentVideoId || null,
        currentTime: videoState.currentTime || 0,
        isPaused: videoState.isPaused ?? true,
        currentVideo: newVideo,
      }));

      // Принудительно перематываем плеер к времени сервера
      const player = playerRef.current;
      const serverTime = videoState.currentTime || 0;

      if (player && serverTime > 0) {
        console.log(
          `Перемотка к начальному времени сервера: ${serverTime} сек.`
        );
        isSeekingRef.current = true;

        // Выполняем перемотку
        player.seekTo(serverTime, "seconds");

        // Через короткий промежуток снимаем флаг перемотки
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 2000);

        // Устанавливаем правильное состояние воспроизведения
        if (videoState.isPaused) {
          player.pauseVideo?.();
        } else {
          player.playVideo?.();
        }
      }
    },
    [playerRef, setRoomData]
  );

  // Настройка обработчиков событий SignalR
  useEffect(() => {
    // Проверяем, доступно ли соединение
    if (connectionRef.current && connectionRef.current.connection) {
      // Обработчик получения обновления состояния видео через SignalR
      connectionRef.current.connection.on(
        "VideoStateUpdated",
        handleVideoStateUpdated
      );

      // Обработчик получения начального состояния видео
      connectionRef.current.connection.on(
        "InitialVideoState",
        handleInitialVideoState
      );

      // Добавляем периодическую проверку здоровья соединения
      const healthCheckInterval = setInterval(checkConnectionHealth, 30000);

      // При размонтировании компонента удаляем обработчики событий
      return () => {
        if (connectionRef.current && connectionRef.current.connection) {
          connectionRef.current.connection.off("VideoStateUpdated");
          connectionRef.current.connection.off("InitialVideoState");
        }
        clearInterval(healthCheckInterval);
      };
    }
  }, [connectionRef, handleVideoStateUpdated, handleInitialVideoState]);

  // Пинг для поддержания соединения активным
  useEffect(() => {
    const keepAliveInterval = setInterval(() => {
      if (
        connectionRef.current?.connection?.state ===
        signalR.HubConnectionState.Connected
      ) {
        // Вместо специального метода для пинга, используем проверку состояния соединения
        // и просто обновляем время последнего взаимодействия
        connectionHealthRef.current.lastPingTime = Date.now();
        console.log("Проверка соединения: соединение активно");
      } else {
        // Если соединение не в состоянии Connected, попробуем восстановить его
        console.warn(
          "Соединение не активно при проверке, попытка восстановления"
        );
        checkConnectionHealth();
      }
    }, 45000); // 45 секунд для предотвращения таймаутов на некоторых прокси

    return () => clearInterval(keepAliveInterval);
  }, [roomId]);

  // Мемоизируем возвращаемый объект
  return useMemo(
    () => ({
      handleTimeUpdate,
      handlePlayPause,
      handleVideoStateUpdated,
      handleInitialVideoState,
      playPauseDebounceTimeoutRef,
      checkConnectionHealth,
    }),
    [
      handleTimeUpdate,
      handlePlayPause,
      handleVideoStateUpdated,
      handleInitialVideoState,
    ]
  );
};
