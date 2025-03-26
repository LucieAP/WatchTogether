import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import Duration from "./Duration";

export default function VideoPlayer({
  roomId,
  currentVideoId,
  playing: propPlaying, // Переименовываем пропс, чтобы избежать конфликта имен
  currentTime,
  onVideoAdded, // Пропс для обработки добавления видео
  onPlayPause, // Пропс для управления воспроизведением
  onTimeUpdate, // Пропс для обновления времени
}) {
  const [playing, setPlaying] = useState(false);
  const [controls, setControls] = useState(false);
  const [light, setLight] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loop, setLoop] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpeedSettingsOpen, setIsSpeedSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rewindInterval, setRewindInterval] = useState(null);
  const [seekPreviewTime, setSeekPreviewTime] = useState(0);
  const [seekPreviewPosition, setSeekPreviewPosition] = useState(0);
  const [isSeekPreviewVisible, setIsSeekPreviewVisible] = useState(false);
  const [lastReportedTime, setLastReportedTime] = useState(0); // Для отслеживания последнего отправленного времени

  const hideControlsTimerRef = useRef(null);
  const playerRef = useRef(null); // Сохранить ссылку на экземпляр плеера
  const containerRef = useRef(null);
  const currentTimeRef = useRef(0); // Для отслеживания актуального времени
  const isSeekingRef = useRef(false);
  const mutedRef = useRef(muted);
  const seekPreviewRef = useRef(null);

  // Cостояние для временных метаданных названия видео и его продолжительности
  const [videoMetadata, setVideoMetadata] = useState({
    title: "",
    duration: 0,
  });

  // Синхронизируем пропс propPlaying с локальным состоянием setPlaying
  useEffect(() => {
    setPlaying(propPlaying);
  }, [propPlaying]);

  useEffect(() => {
    if (currentTime > 0 && playerRef.current) {
      playerRef.current.seekTo(currentTime, "seconds");
    }
  }, [currentVideoId, currentTime]);

  // Обработчик готовности плеера.
  // Вызывается когда ReactPlayer завершил инициализацию и внутренний плеер готов к работе

  const handlePlayerReady = () => {
    // Получаем доступ к нативному YouTube плееру
    const internalPlayer = playerRef.current?.getInternalPlayer();

    // Проверяем существование плеера и наличие метода getVideoData
    // (защита от возможных ошибок в разных реализациях плееров)
    if (internalPlayer && internalPlayer.getVideoData) {
      const data = internalPlayer.getVideoData();
      setVideoMetadata((prev) => ({
        ...prev,
        title: data.title || "Неизвестное название", // Устанавливаем название видео из данных YouTube
      }));
    }
  };

  // // Обработчик получения длительности видео. Вызывается автоматически
  // // ReactPlayer после загрузки метаданных контента
  // const handleDuration = (duration) => {
  //   setVideoMetadata((prev) => ({
  //     ...prev,
  //     duration: Math.round(duration), // Обновляем состояние с новой длительностью
  //   }));
  // };

  /* Обработчики */

  // Обработчик включения контролсов (значок замка)
  const handleToggleControls = () => {
    console.log("Toggling controls:", !controls);

    setControls((prev) => !prev);

    resetTimeout();
  };

  // Обработчик изменения слайдера звука
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // Если пользователь устанавливает громкость больше 0, звук автоматически включается
    if (newVolume > 0 && muted) {
      setMuted(false);
    }
    // Если громкость становится равной 0 включить режим muted
    if (newVolume === 0 && !muted) {
      setMuted(true);
    }
  };

  // Обработчик мута звка
  const handleToggleMuted = () => {
    // Если мы включаем мьют сохраняем текущую громкость
    setMuted((prevMuted) => !prevMuted);
  };

  // Обработчик изменения скорости видео
  const handleSetPlaybackRate = (speed) => {
    setPlaybackRate(speed);
    setIsSpeedSettingsOpen(false);
  };

  // Обработчик нажатия кнопки мыши на ползунке (Начинает процесс перемотки)
  const handleSeekMouseDown = () => {
    setSeeking(true); // Устанавливаем состояние seeking в true, чтобы указать, что началась перемотка
  };

  // Обработчик отпускания кнопки мыши на ползунке (Завершает процесс перемотки)
  const handleSeekMouseUp = (e) => {
    setSeeking(false); // Устанавливаем состояние seeking в false, чтобы указать, что перемотка завершена
    const value = parseFloat(e.target.value);

    // Перемотка на точное значение в секундах
    const exactSeconds = value * duration; // Вычисляем точное время в секундах на основе значения ползунка и общей длительности
    playerRef.current.seekTo(exactSeconds, "seconds"); // Перематываем плеер на указанное время

    // Вызываем onTimeUpdate после перемотки
    if (onTimeUpdate) {
      onTimeUpdate(exactSeconds);
    }
  };

  // Обработчик изменения значения ползунка
  const handleSeekChange = (e) => {
    const value = parseFloat(e.target.value); // Получаем текущее значение ползунка
    setPlayed(value);

    // Для согласованности также обновляем время и позицию предпросмотра
    const exactSeconds = value * duration;
    setSeekPreviewTime(exactSeconds);
    setSeekPreviewPosition(value * 100);
  };

  // Обработчик для предпросмотра перемотки (показ времени при наведении на прогресс-бар)
  const handleSeekPreview = (e) => {
    // Получаем контейнер прогресс-бара
    const container = e.currentTarget;

    // Находим непосредственно элемент input[type="range"]
    const progressBar = container.querySelector(".player-progress-bar");
    const seekPreview = seekPreviewRef.current;

    if (!progressBar || !duration || !seekPreview) return;

    // Получаем реальные размеры и позицию полосы прогресса
    const barRect = progressBar.getBoundingClientRect(); // getBoundingClientRect() возвращает размеры и координаты элемента относительно окна браузера

    // Вычисляем позицию курсора относительно полосы прогресса
    let offsetX = e.clientX - barRect.left; // e.clientX — координата курсора по оси X относительно окна.

    offsetX = Math.max(0, Math.min(offsetX, barRect.width)); // Ограничиваем смещение диапазоном [0, barRect.width], чтобы избежать выхода за границы.

    // // Получаем ширину превью
    // const previewWidth = seekPreview.offsetWidth;
    // const previewHalfWidth = previewWidth / 2;

    // // Корректируем позицию, чтобы превью не выходило за границы
    // let adjustedX = offsetX;
    // if (previewWidth > 0) {
    //   if (adjustedX < previewHalfWidth) {
    //     adjustedX = previewHalfWidth;
    //   } else if (adjustedX > barRect.width - previewHalfWidth) {
    //     adjustedX = barRect.width - previewHalfWidth;
    //   }
    // }

    // Рассчитываем процент и время
    const percentage = offsetX / barRect.width;
    const exactTime = percentage * duration;

    // Сохраняем точное значение в секундах
    setSeekPreviewTime(exactTime);

    // Вычисляем процентную позицию на основе того же значения
    setSeekPreviewPosition(percentage * 100);
  };

  // Обработчик для показа превью перемотки (например, при наведении на прогресс-бар)
  const handleSeekPreviewShow = () => setIsSeekPreviewVisible(true);

  // Обработчик для скрытия превью перемотки (например, при уходе курсора с прогресс-бара)
  const handleSeekPreviewHide = () => setIsSeekPreviewVisible(false);

  // Обработчик изменения прогресса воспроизведения
  const handleProgress = (state) => {
    if (!seeking) {
      setPlayed(state.played);

      // Вычисляем текущее время в секундах
      const currentSeconds = state.playedSeconds;
      currentTimeRef.current = currentSeconds;

      // Вызываем onTimeUpdate только если время значительно изменилось (например, более 1 секунды)
      // и не находимся в режиме перемотки
      if (
        onTimeUpdate &&
        Math.abs(currentSeconds - lastReportedTime) >= 1.0 &&
        !isSeekingRef.current
      ) {
        onTimeUpdate(currentSeconds);
        setLastReportedTime(currentSeconds);
      }
    }
  };

  // Обработчик начала воспроизведения
  const handlePlay = () => {
    setPlaying(true);
    resetTimeout();

    // Добавляем вызов пропса onPlayPause с действием "play"
    onPlayPause && onPlayPause("play");
  };

  // Обработчик паузы
  const handlePause = () => {
    setPlaying(false);
    setControlsVisible(true);

    // Добавляем вызов пропса onPlayPause с действием "pause"
    onPlayPause && onPlayPause("pause");
  };

  // Обработчик переключения между воспроизведением и паузой
  const handlePlayPause = () => {
    const newPlayingState = !playing;
    setPlaying(newPlayingState);

    // Вызываем onPlayPause с соответствующим действием
    onPlayPause && onPlayPause(newPlayingState ? "play" : "pause");

    resetTimeout();
  };

  // Обработчик переключения в полноэкранный режим
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const element = document.querySelector(".video-container");
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        /* Firefox */
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        /* Chrome, Safari и Opera */
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        /* IE/Edge */
        element.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        /* Chrome, Safari и Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        /* IE/Edge */
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);

  // Обработчик активности отслеживания движения мыши во время во время скрытия контролсов
  const handleActivity = () => {
    setControlsVisible(true);
    resetTimeout();
  };

  // Функция для сброса таймера скрытия элементов управления
  const resetTimeout = () => {
    // Очищаем предыдущий таймер, если он есть
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Запускаем таймер, по истечении которого контролы скроются (например, через 3 секунды)
    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  };

  // Эффект для отслеживания движения мыши или клика в контейнере видеоплеера
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    container?.addEventListener("mousemove", handleActivity);
    container?.addEventListener("click", handleActivity); // Добавляем этот обработчик

    return () => {
      container?.removeEventListener("mousemove", handleActivity);
      container?.removeEventListener("click", handleActivity); // И сюда тоже
    };
  }, []);

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  // Обработчик нажатия на кнопку настроек
  const toggleSettings = (e) => {
    e.stopPropagation();
    setIsSettingsOpen(!isSettingsOpen);
    setIsSpeedSettingsOpen(false);
  };

  // Обработчик нажатия на кнопку настройки скорости видео (внутри кнопки настроек)
  const openSpeedSettings = (e) => {
    e.stopPropagation();
    setIsSpeedSettingsOpen(true);
  };

  // Обработчик для закрытия окон при клике вне элементов
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isSettingsButton = e.target.closest(".settings-button");
      const isSettingsList = e.target.closest(".settings-list");
      const isSpeedSettings = e.target.closest(".speed-settings-values");

      if (!isSettingsButton && !isSettingsList && !isSpeedSettings) {
        setIsSettingsOpen(false);
        setIsSpeedSettingsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Обновляем ref (currentTimeRef) при изменении played или duration
  useEffect(() => {
    currentTimeRef.current = duration * played;
  }, [played, duration]);

  // Обновляем ref (mutedRef) при изменении muted
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Обработчик нажатия клавиш
  const handleKeyDown = (e) => {
    // Игнорируем события, если фокус на элементе input (например, поле ввода)
    if (e.target.tagName.toLowerCase() === "input") return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        handlePlayPause(); // Переключаем воспроизведение/паузу
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen(); // Переключаем полноэкранный режим
        break;
      case "m":
        e.preventDefault();
        setMuted((prev) => !prev); // Переключаем звук (вкл/выкл) с использованием функционального обновления
        break;
      case "arrowup":
        e.preventDefault();
        setVolume((prev) => Math.min(1, +(prev + 0.1).toFixed(1))); // Увеличиваем громкость на 10% (максимум 1)
        break;
      case "arrowdown":
        e.preventDefault();
        setVolume((prev) => Math.max(0, +(prev - 0.1).toFixed(1))); // Уменьшаем громкость на 10% (максимум 1)
        break;
      case "arrowleft":
      case "arrowright":
        e.preventDefault();
        if (!rewindInterval) {
          startRewind(e.key.toLowerCase()); // Начинаем перемотку видео влево или вправо
        }
        break;
    }
  };

  // Обработчик отпускания клавиш
  const handleKeyUp = (e) => {
    // Если отпущены клавиши "влево" или "вправо", останавливаем перемотку
    if (["arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
      stopRewind();
    }
  };

  // Функция начала перемотки
  const startRewind = (direction) => {
    // Если уже выполняется перемотка, выходим
    if (isSeekingRef.current) return;
    isSeekingRef.current = true;

    // Определяем шаг перемотки: -5 секунд для "влево", +5 секунд для "вправо"
    const step = direction === "arrowleft" ? -5 : 5;

    // Мгновенно перемещаемся на шаг при первом нажатии
    seek(step);

    // Устанавливаем интервал для повторной перемотки каждые 100 мс
    const interval = setInterval(() => {
      seek(step);
    }, 100);

    // Сохраняем интервал в состоянии
    setRewindInterval(interval);
  };

  // Функция перемотки
  const seek = (step) => {
    // Вычисляем новое время воспроизведения
    const newTime = currentTimeRef.current + step;
    // Ограничиваем время в пределах от 0 до длительности медиафайла
    const clampedTime = Math.max(0, Math.min(newTime, duration));

    // Если доступен playerRef, перематываем плеер
    if (playerRef.current) {
      playerRef.current.seekTo(clampedTime, "seconds"); // Перематываем на указанное время
      currentTimeRef.current = clampedTime; // Обновляем ref с текущим временем
      setPlayed(clampedTime / duration); // Обновляем состояние played
    }

    // Вызываем onTimeUpdate после перемотки
    if (onTimeUpdate) {
      onTimeUpdate(clampedTime);
      setLastReportedTime(clampedTime);
    }
  };

  // Убедимся, что контейнер в фокусе (чтобы обработчики клавиш работали)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Функция остановки перемотки
  const stopRewind = () => {
    isSeekingRef.current = false; // Сбрасываем флаг перемотки
    if (rewindInterval) {
      clearInterval(rewindInterval); // Очищаем интервал
      setRewindInterval(null); // Сбрасываем состояние интервала
    }
  };

  return (
    <div className="player-wrapper">
      <div
        className="video-container"
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        autoFocus
      >
        <ReactPlayer
          ref={playerRef} // Ссылка для доступа к API плеера
          key={`${currentVideoId}-${controls}`}
          className="react-player"
          url={`https://www.youtube.com/watch?v=${currentVideoId}`}
          width="100%"
          height="100%"
          playing={playing}
          controls={controls}
          playbackRate={playbackRate}
          volume={volume}
          muted={muted}
          onReady={handlePlayerReady} // Обработчик завершения инициализации
          onPlay={handlePlay}
          onPause={handlePause}
          onProgress={handleProgress}
          onDuration={setDuration}
          onError={(e) => console.error("Ошибка плеера:", e)}
          config={{
            // Кастомные настройки YouTube-плеера
            youtube: {
              playerVars: {
                modestbranding: 1, // Скрыть лого YouTube
                rel: 0, // Не показывать похожие видео в конце
                iv_load_policy: 3, // Скрывает аннотации поверх видео
                cc_load_policy: 0, // Отключает автоматическое включение субтитров
                subtitles: 0, // Отключает субтитры

                hl: "ru", // Язык интерфейса плеера (код языка)
              },
            },
          }}
        />

        {/* Невидимый оверлей для правильного перехвата движения мыши */}
        {!controls && (
          <div
            className="overlay"
            onMouseMove={handleActivity}
            onClick={handlePlayPause} // Добавьте этот обработчик
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,

              backgroundColor: "transparent",
              zIndex: 2,
              pointerEvents: "auto",
            }}
          />
        )}

        <div
          className="play-pause-container"
          style={{ opacity: controlsVisible ? 1 : 0 }}
        >
          <button className="play-pause-btn" onClick={handlePlayPause}>
            {playing ? (
              // Если видео воспроизводится, показываем SVG для «Pause»
              <svg
                className="svg_bottom_play"
                aria-hidden="true"
                focusable="false"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 320 512"
              >
                <path
                  fill="currentColor"
                  d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"
                />
              </svg>
            ) : (
              // Если видео на паузе, показываем SVG для «Play»
              <svg
                className="svg_center_play"
                aria-hidden="true"
                focusable="false"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
              >
                <path
                  fill="currentColor"
                  d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="player-controls-container">
          {/* Вынесенный прогресс-бар - теперь на том же уровне, что и controls */}
          {controlsVisible && !controls && (
            <div className="player-progress-bar-container">
              <div
                className="progress-bar-wrapper"
                onMouseMove={handleSeekPreview}
                onMouseEnter={handleSeekPreviewShow}
                onMouseLeave={handleSeekPreviewHide}
              >
                <input
                  className="player-progress-bar"
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={played}
                  onMouseDown={handleSeekMouseDown} // Обработчик нажатия кнопки мыши на ползунке
                  onChange={handleSeekChange} // Обработчик изменения значения ползунка
                  onMouseUp={handleSeekMouseUp} // Обработчик отпускания кнопки мыши на ползунке
                />
                {isSeekPreviewVisible && (
                  <div
                    className="seek-preview"
                    ref={seekPreviewRef}
                    style={{
                      left: `${seekPreviewPosition}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <Duration seconds={seekPreviewTime} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Блок элементов управления - рендерится только при controls: true */}
          {controlsVisible && !controls && (
            <div className={`player-controls`}>
              {/* Левая группа - кнопка воспроизведения и время */}
              <div className="controls-left-group">
                <button className="play-button" onClick={handlePlayPause}>
                  {playing ? (
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 320 512"
                    >
                      <path
                        fill="currentColor"
                        d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"
                      />
                    </svg>
                  ) : (
                    // Если видео на паузе — показываем иконку "play"
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 384 512"
                    >
                      <path
                        fill="currentColor"
                        d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
                      />
                    </svg>
                  )}
                </button>

                <div className="time-display">
                  <span className="time-current">
                    {<Duration seconds={duration * played} />}
                  </span>
                  <span className="time-separator"> / </span>
                  <span className="time-duration">
                    {<Duration seconds={duration} />}
                  </span>
                </div>
              </div>

              {/* Правая группа - остальные элементы управления */}
              <div className="controls-right-group">
                <div className="volume-container">
                  <button className="volume-btn" onClick={handleToggleMuted}>
                    {!muted ? (
                      <svg
                        className="svg-volume-not-muted"
                        aria-hidden="true"
                        focusable="false"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 640 512"
                      >
                        <path
                          fill="currentColor"
                          d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="svg-volume-muted"
                        aria-hidden="true"
                        focusable="false"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 576 512"
                      >
                        <path
                          fill="currentColor"
                          d="M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"
                        ></path>
                      </svg>
                    )}
                  </button>

                  <input
                    className="volume-change-bar"
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    // Если звук заглушён, то слайдер отображает 0, иначе текущее значение volume
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                  />
                </div>
                <button className="settings-button" onClick={toggleSettings}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <defs>
                      <clipPath id="clip-dRPciZ8T0COj">
                        <path
                          fill="currentColor"
                          d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
                        ></path>
                      </clipPath>
                    </defs>
                    <rect
                      fill="currentColor"
                      clipPath="url(#clip-dRPciZ8T0COj)"
                      mask="url(#mask-rTVkSWt4GzQZ)"
                      x="0"
                      y="0"
                      width="100%"
                      height="100%"
                    ></rect>
                  </svg>
                </button>
                {isSettingsOpen && (
                  <div
                    className="settings-list"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="speed-settings-btn"
                      onClick={openSpeedSettings}
                    >
                      <span>
                        Скорость
                        <span>{playbackRate}x</span>
                      </span>
                    </button>
                  </div>
                )}

                {isSpeedSettingsOpen && (
                  <div
                    className="speed-settings-values"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[0.5, 1, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        className="speed-value"
                        onClick={() => handleSetPlaybackRate(speed)}
                        value={speed}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className="fullscreen-button"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      data-prefix="fas"
                      data-icon="compress"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                    >
                      <path
                        fill="currentColor"
                        d="M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-64zM320 320c-17.7 0-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512"
                    >
                      <path
                        fill="currentColor"
                        d="M32 32C14.3 32 0 46.3 0 64l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-64zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96z"
                      ></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="lock-button" onClick={handleToggleControls}>
          {controls ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="44"
              height="44"
            >
              <path
                fill="currentColor"
                d="M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5 5 5 0 0 1 5 5v2h1m-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                fill="currentColor"
                d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 6V8h6V6c0-1.66-1.34-3-3-3S9 4.34 9 6z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
