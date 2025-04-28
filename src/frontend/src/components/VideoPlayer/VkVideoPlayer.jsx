import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import "./VkVideoPlayer.css";

const VkVideoPlayer = forwardRef(
  (
    {
      videoId,
      ownerId,
      hd = 2,
      playing: initialPlaying = false,
      currentTime: initialCurrentTime = 0,
      onPlayPause,
      onTimeUpdate,
      onDuration,
      onReady,
      onError,
    },
    ref
  ) => {
    // Референс для iframe
    const iframeRef = useRef(null);
    // Референс для VK плеера
    const playerRef = useRef(null);
    // Состояние текущего времени видео
    const [currentTime, setCurrentTime] = useState(initialCurrentTime);
    // Состояние общей продолжительности видео
    const [duration, setDuration] = useState(0);
    // Состояние воспроизведения
    const [playing, setPlaying] = useState(initialPlaying);
    // Состояние загрузки плеера
    const [playerLoaded, setPlayerLoaded] = useState(false);
    // Состояние для отслеживания, находимся ли в процессе изменения времени
    const [seeking, setSeeking] = useState(false);

    // Экспортируем методы, делая их доступными родительскому компоненту через ref
    useImperativeHandle(ref, () => ({
      // Получить текущее время воспроизведения
      getCurrentTime: () => {
        if (playerRef.current && isLoaded) {
          return playerRef.current.getCurrentTime();
        }
        return 0;
      },

      // Перемотать к определенному времени
      seekTo: (seconds) => {
        if (playerRef.current && isLoaded) {
          playerRef.current.seek(seconds, "seconds");
        }
      },

      // Дополнительные методы, которые могут быть полезны
      getDuration: () => {
        if (playerRef.current && isLoaded) {
          return playerRef.current.getDuration();
        }
        return 0;
      },

      // Поставить на паузу
      pauseVideo: () => {
        if (playerRef.current && isLoaded) {
          playerRef.current.pause();
        }
      },

      // Запустить воспроизведение
      playVideo: () => {
        if (playerRef.current && isLoaded) {
          playerRef.current.play();
        }
      },

      isPlaying: () => playing,
      getIsSeeking: () => seeking,
    }));

    // Синхронизация пропсов с состоянием
    useEffect(() => {
      setPlaying(initialPlaying);
    }, [initialPlaying]);

    useEffect(() => {
      if (
        playerRef.current &&
        Math.abs(currentTime - initialCurrentTime) > 1 &&
        !seeking
      ) {
        console.log("Синхронизация времени:", initialCurrentTime);
        playerRef.current.seek(initialCurrentTime);
        setCurrentTime(initialCurrentTime);
      }
    }, [initialCurrentTime, seeking]);

    // Инициализация VK плеера после загрузки iframe
    useEffect(() => {
      if (!iframeRef.current) return;

      console.log("Ожидание загрузки плеера VK...");

      // Загрузка VK VideoPlayer API
      const loadVkApi = () => {
        return new Promise((resolve, reject) => {
          if (window.VK && window.VK.VideoPlayer) {
            resolve();
            return;
          }

          const script = document.createElement("script");
          script.src = "https://vk.com/js/api/videoplayer.js";
          script.async = true;
          script.onload = () => {
            console.log("VK VideoPlayer API загружен");
            resolve();
          };
          script.onerror = (error) => {
            console.error("Ошибка загрузки VK VideoPlayer API:", error);
            reject(error);
          };
          document.body.appendChild(script);
        });
      };

      const initPlayer = async () => {
        try {
          await loadVkApi();

          const onIframeLoad = () => {
            try {
              console.log("Iframe загружен, создание экземпляра плеера VK");
              playerRef.current = window.VK.VideoPlayer(iframeRef.current);
              console.log("Экземпляр плеера VK создан");

              // Подписываемся на события плеера
              playerRef.current.on(
                window.VK.VideoPlayer.Events.INITED,
                (state) => {
                  console.log("Плеер VK инициализирован", state);
                  setPlayerLoaded(true);
                  setDuration(state.duration);
                  if (onDuration) onDuration(state.duration);
                  if (onReady) onReady();

                  // Устанавливаем начальное время, если оно задано
                  if (initialCurrentTime > 0) {
                    playerRef.current.seek(initialCurrentTime);
                  }

                  // Устанавливаем начальное состояние воспроизведения
                  if (initialPlaying) {
                    playerRef.current.play();
                  }
                }
              );

              playerRef.current.on(
                window.VK.VideoPlayer.Events.TIMEUPDATE,
                (state) => {
                  if (!seeking) {
                    setCurrentTime(state.time);
                    if (onTimeUpdate) onTimeUpdate(state.time);
                  }
                }
              );

              playerRef.current.on(window.VK.VideoPlayer.Events.STARTED, () => {
                console.log("Воспроизведение начато");
                setPlaying(true);
                if (onPlayPause) onPlayPause("play");
              });

              playerRef.current.on(window.VK.VideoPlayer.Events.RESUMED, () => {
                console.log("Воспроизведение возобновлено");
                setPlaying(true);
                if (onPlayPause) onPlayPause("play");
              });

              playerRef.current.on(window.VK.VideoPlayer.Events.PAUSED, () => {
                console.log("Воспроизведение на паузе");
                setPlaying(false);
                if (onPlayPause) onPlayPause("pause");
              });

              playerRef.current.on(window.VK.VideoPlayer.Events.ENDED, () => {
                console.log("Воспроизведение закончено");
                setPlaying(false);
                setCurrentTime(0);
                if (onPlayPause) onPlayPause("pause");
              });

              playerRef.current.on(
                window.VK.VideoPlayer.Events.ERROR,
                (error) => {
                  console.error("Ошибка плеера VK:", error);
                  if (onError) onError(error);
                }
              );
            } catch (error) {
              console.error("Ошибка инициализации плеера VK:", error);
              if (onError) onError(error);
            }
          };

          // Если iframe уже загружен
          if (iframeRef.current.contentDocument?.readyState === "complete") {
            console.log("Iframe уже загружен");
            onIframeLoad();
          } else {
            // Иначе ждем загрузки iframe
            console.log("Ожидание загрузки iframe");
            iframeRef.current.addEventListener("load", onIframeLoad);
          }
        } catch (error) {
          console.error("Ошибка при инициализации плеера VK:", error);
          if (onError) onError(error);
        }
      };

      initPlayer();

      return () => {
        if (iframeRef.current) {
          iframeRef.current.removeEventListener("load", () => {});
        }
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [
      initialCurrentTime,
      initialPlaying,
      onDuration,
      onError,
      onPlayPause,
      onReady,
      onTimeUpdate,
    ]);

    // Функция для воспроизведения видео
    const playVideo = useCallback(() => {
      if (playerRef.current) {
        console.log("Запуск воспроизведения VK");
        playerRef.current.play();
      }
    }, []);

    // Функция для паузы видео
    const pauseVideo = useCallback(() => {
      if (playerRef.current) {
        console.log("Постановка на паузу VK");
        playerRef.current.pause();
      }
    }, []);

    // Функция для перемотки видео
    const seekTo = useCallback((time) => {
      if (playerRef.current) {
        console.log("Перемотка на", time, "секунд");
        setSeeking(true);
        playerRef.current.seek(time);
        setTimeout(() => setSeeking(false), 300); // Небольшая задержка, чтобы избежать колебаний
      }
    }, []);

    // URL видео VK
    const videoUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=${hd}&js_api=1`;

    return (
      <div className="player-wapper">
        <div className="vk-player-container">
          <iframe
            ref={iframeRef}
            src={videoUrl}
            width="100%"
            height="100%"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture;"
            allowFullScreen
            title="VK Video Player"
          />
        </div>
      </div>
    );
  }
);

export default VkVideoPlayer;
