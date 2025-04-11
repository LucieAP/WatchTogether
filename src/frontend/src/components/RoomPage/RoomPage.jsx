// RoomPage.jsx:

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { updateRoom } from "../../api/rooms";
import { getRoom } from "../../api/rooms";
import { createConnection } from "../../api/media";
import axios from "axios";
import VideoPlayer from "../VideoPlayer/VideoPlayer";
import { useDebouncedCallback } from "use-debounce";
import { AddVideoModal } from "../AddVideoModal";

import {
  leaveRoom,
  handleManualLeave,
  // setupBrowserCloseHandler,
  // handleTimeoutLeave,
  // handleNetworkDisconnect,
} from "../../api/leaveRoomAction";

// Парамтеры для текста
const INPUT_PROPS = {
  spellCheck: "false",
  autoCorrect: "off",
  autoCapitalize: "none",
};

export default function RoomPage({
  isSettingsModalOpen,
  onSettingsClose,
  roomData: initialRoomData,
  refetchRoomData,
  onLeaveRoomHandler, // Функция для обработки выхода из комнаты
}) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  // Отслеживаем взаимодействие с мышью, чтобы решить проблему закрытия модального окна при копировании текста и выходе курсора за его границы
  const mouseDownOnContentRef = useRef(false);

  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
  });
  const connectionRef = useRef(null);
  const messagesEndRef = useRef(null); // Ref для автопрокрутки чата
  const playerRef = useRef(null); // Ref для получения методов плеер проброшенного из VideoPlayer.jsx

  const isSeekingRef = useRef(false); // Отслеживает активную перемотку, блокируя отправку времени во избежание петель.
  const lastReportedTimeRef = useRef(0); // Хранит последнее отправленное время для контроля значительных изменений.
  const lastServerUpdateRef = useRef(0); // Фиксирует время последнего серверного обновления, предотвращая обработку слишком частых апдейтов
  // Добавляем новый ref для отслеживания последнего отправленного состояния паузы
  const lastPlayPauseActionRef = useRef(null);
  const lastPlayPauseTimeRef = useRef(null); // Время последнего действия
  const playPauseDebounceTimeoutRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // ref для отслеживания статуса соединения disconnected/connected/reconnecting/error

  const navigate = useNavigate();

  const [inactivityTimer, setInactivityTimer] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  // Константа для времени неактивности (30 минут)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 минут в миллисекундах

  // Объединяем данные комнаты в одно состояние
  const [roomData, setRoomData] = useState({
    roomName: "Название комнаты",
    description: "",
    invitationLink: "",
    participants: [],
    currentVideoId: null,
    currentVideo: [],
    isPaused: true,
    currentTime: 0,

    ...initialRoomData, // Добавляем начальные значения
  });

  console.log("roomData RoomPage: ", roomData);

  /* Работа с видео */

  /* Регулярное выражение для всех форматов YouTube
  https://youtube.com/watch?v=ID
  https://www.youtube.com/watch?v=ID
  https://youtu.be/ID
  youtube.com/shorts/ID
  */
  const YOUTUBE_REGEX =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [tempMetadata, setTempMetadata] = useState({ title: "", duration: 0 });

  // Обработчик добавления видео
  const handleAddVideoModal = async () => {
    const match = videoUrl.match(YOUTUBE_REGEX);
    if (match && match[1].length === 11) {
      const videoId = match[1]; // id видео ютуба (11 цифр)

      try {
        // Используем данные из tempMetadata
        const { title, duration } = tempMetadata;

        console.log("videoId: ", videoId);
        console.log("duration: ", duration);
        console.log("title: ", title);

        // Обновляем видео в комнате на бэкенде
        const response = await axios.put(`/api/Rooms/${roomId}/video`, {
          videoId: match[1],
          title,
          duration,
        });

        console.log("Update Video and Room: ", response);

        // Обновляем состояние на основе ответа сервера
        setRoomData((prev) => ({
          ...prev,
          currentVideoId: videoId,
          currentVideo: { videoId: match[1], title, duration },
        }));

        setIsAddVideoModalOpen(false);
        setVideoUrl("");
        setTempMetadata({ title: "", duration: 0 }); // Сброс метаданных
      } catch (error) {
        console.error("Ошибка при обновлении видео:", error);
      }
    } else {
      alert("Пожалуйста, введите корректную ссылку YouTube");
    }
  };

  useEffect(() => {
    console.log("Текущее видео изменилось:", roomData);
  }, [roomData.currentVideoId]);

  // Сброс метаданных при закрытии модалки
  const closeAddVideoModal = () => {
    setIsAddVideoModalOpen(false);
    setVideoUrl("");
    setTempMetadata({ title: "", duration: 0 });
  };

  // // Обработчик управления плеером
  // const handlePlayPause = async (action) => {
  //   try {
  //     const response = await axios.patch(`/api/rooms/${roomId}/player`, {
  //       isPaused: action === "pause",
  //     });
  //     console.log("IsPaused: ", response.data.isPaused);
  //     console.log("response.data after Pause: ", response.data);
  //     setRoomData((prev) => ({ ...prev, isPaused: action === "pause" }));
  //   } catch (error) {
  //     console.error("Ошибка синхронизации:", error);
  //   }
  // };

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

  // В iframe api ютуба getCurrentTime() предоставляет данные примерно с интервалом в 250 миллисекунд – то есть около 4 раз в секунду
  // Отправляет время на сервер при каждом обновлении времени воспроизведения
  const handleTimeUpdate = useDebouncedCallback(async (seconds) => {
    // const player = playerRef.current;
    // const isSeeking = player?.getIsSeeking?.() || false; // Получаем состояние перемотки из плеера

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

  const handleCloseVideo = async () => {
    try {
      await axios.delete(`/api/Rooms/${roomId}/video`, { roomId });

      // Обновляем локальное состояние
      setRoomData((prev) => ({
        ...prev,
        currentVideoId: null,
        currentVideo: null,
      }));
    } catch (error) {
      console.error("Ошибка при удалении видео:", error);
    }
  };

  /* Конец работы с видео*/

  // Синхронизируем только при изменении initialRoomData
  useEffect(() => {
    if (initialRoomData) {
      setRoomData((prev) => ({
        ...prev,
        ...initialRoomData,
      }));
    }
  }, [initialRoomData]);

  // Обработчик копирования ссылки
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomData.invitationLink);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } catch (err) {
      console.error("Ошибка копирования:", err);
    }
  };

  // Закрытие модалок при клике на фон
  const handleCloseModal = (e) => {
    if (e.target === e.currentTarget && !mouseDownOnContentRef.current) {
      setIsInviteModalOpen(false);
      setIsAddVideoModalOpen(false);
      onSettingsClose();
    }
    mouseDownOnContentRef.current = false;
  };

  // Обработка сохранения изменений при настройке комнаты
  const handleSaveSettings = async () => {
    try {
      const response = await updateRoom(roomId, {
        roomName: roomData.roomName,
        description: roomData.description,
      });

      // Получаем обновленные данные с сервера
      const updatedRoomResponse = await getRoom(roomId);

      setRoomData((prev) => ({
        ...prev,
        roomName: response.newRoomName,
        description: response.newRoomName,
      }));

      console.log("Обновленные данные:", {
        name: response.newRoomName,
        desc: response.newDescription,
      });

      // Принудительно обновляем данные
      await refetchRoomData();

      onSettingsClose();
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", {
        message: error.message,
        fullError: error, // Выводим полный объект ошибки
      });
      // Расширенная диагностика ошибок
      if (error.response) {
        console.error("Данные ответа сервера:", error.response.data);
        console.error("HTTP статус:", error.response.status);
      }
    }
  };

  // Загрузка данных комнаты и подключение к чату
  useEffect(() => {
    const setupChat = async () => {
      try {
        const joinResponse = await axios.post(`/api/Rooms/${roomId}/join`);
        console.log("Join response data:", joinResponse.data);

        setUserInfo({
          userId: joinResponse.data.userId,
          username: joinResponse.data.username,
        });

        // Подключаемся к SignalR
        const { connection, start, sendMessage, checkConnection, reconnect } =
          createConnection(
            roomId,
            handleNewMessage,
            handleParticipantsUpdated,
            handleChatHistory,
            joinResponse.data.username,
            joinResponse.data.userId,
            handleVideoStateUpdated,
            handleConnectionStateChanged
          );

        connectionRef.current = {
          connection,
          sendMessage,
          checkConnection,
          reconnect,
        };
        await start();
      } catch (error) {
        console.error("Chat setup error:", error);
        setConnectionStatus("error");
      }
    };

    setupChat();

    // Настраиваем обработчик закрытия браузера/вкладки
    // const cleanupBrowserClose = setupBrowserCloseHandler(roomId, connectionRef);

    // Запускает проверку  каждые 30 секунд (30000 мс)
    // При каждом срабатывании выполняется проверка состояния соединения
    const pingInterval = setInterval(() => {
      if (
        connectionRef.current?.checkConnection && // Проверка существование метода checkConnection
        !connectionRef.current.checkConnection() // Вызываем метод,если false (соединение разорвано), если true то все норм
      ) {
        console.log("Connection check failed, attempting to reconnect");
        connectionRef.current?.reconnect?.();
      }
    }, 30000); // Проверка каждые 30 секунд

    // // Запускаем таймер проверки активности
    // const activityCheckInterval = setInterval(() => {
    //   const now = Date.now();
    //   if (now - lastActivity > INACTIVITY_TIMEOUT) {
    //     console.log("User inactive for too long, leaving room");
    //     handleTimeoutLeave(roomId, connectionRef, navigate);
    //   }
    // }, 60000); // Проверка каждую минуту

    // // Добавляем обработчики событий для отслеживания активности
    // window.addEventListener("mousemove", registerActivity);
    // window.addEventListener("keydown", registerActivity);
    // window.addEventListener("click", registerActivity);
    // window.addEventListener("scroll", registerActivity);

    return () => {
      // Очищаем все интервалы и обработчики событий
      // cleanupBrowserClose();
      clearInterval(pingInterval); // 1. Останавливает ping-проверки
      //clearInterval(activityCheckInterval);

      // window.removeEventListener("mousemove", registerActivity);
      // window.removeEventListener("keydown", registerActivity);
      // window.removeEventListener("click", registerActivity);
      // window.removeEventListener("scroll", registerActivity);

      // 2. Проверяет наличие соединения
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop(); // 3. Корректно останавливает SignalR соединение
      }
    };
  }, [roomId, navigate, lastActivity]);

  // Функция для ручного переподключения
  const handleManualReconnect = async () => {
    if (connectionRef.current?.reconnect) {
      setConnectionStatus("reconnecting");
      try {
        await connectionRef.current.reconnect();
      } catch (error) {
        console.error("Manual reconnection failed:", error);
        setConnectionStatus("error");
      }
    }
  };

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Обработчик нового сообщения
  const handleNewMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        // Используем ID сообщения, если есть, или генерируем уникальный
        id:
          message.messageId ||
          Date.now() + Math.random().toString(36).substr(2),
      },
    ]);
    console.log("Получено новое сообщение:", message);
  };

  // Функция-обработчик кнопки "Выйти из комнаты"
  const onLeaveRoom = () => {
    handleManualLeave(roomId, connectionRef, navigate);
  };

  // // Вызываем колбэк из родителя, передавая ему нашу функцию при монтировании компонента
  // useEffect(() => {
  //   if (onLeaveRoomHandler) {
  //     onLeaveRoomHandler(onLeaveRoom);
  //   }
  // }, [onLeaveRoomHandler]);

  // Обработчик получения истории чата
  const handleChatHistory = (history) => {
    // Преобразуем историю в формат, используемый в компоненте
    const formattedHistory = history.map((msg) => ({
      id: msg.messageId || msg.timestamp + Math.random().toString(36).substr(2),
      userId: msg.userId === "System" ? null : msg.userId,
      userName: msg.userName,
      message: msg.message,
      isSystem: msg.userId === "System",
      timestamp: new Date(msg.timestamp),
    }));

    setMessages(formattedHistory);
    console.log("Получена история сообщений:", formattedHistory);
  };

  // Обработчик изменения состояния соединения
  const handleConnectionStateChanged = (state, error) => {
    console.log(`Connection state changed to: ${state}`, error);
    setConnectionStatus(state);

    // Дополнительная логика при изменении состояния
    if (state === "disconnected" && error) {
      // Пытаемся уведомить сервер о проблеме с сетью
      handleNetworkDisconnect(roomId, connectionRef);
    }
  };

  // Регистрируем любую активность пользователя
  const registerActivity = () => {
    setLastActivity(Date.now());
  };

  // Обработчик обновления пользователей
  const handleParticipantsUpdated = async () => {
    try {
      const response = await axios.get(`/api/Rooms/${roomId}`);
      setRoomData((prev) => ({
        ...prev,
        participants: response.data.room.participants,
      }));
      console.log(
        "Список участников обновлен:",
        response.data.room.participants
      );
    } catch (error) {
      console.error("Ошибка при обновлении списка участников:", error);
    }
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

    // const isSeeking = player?.getIsSeeking?.() || false;

    // console.log(
    //   `Синхронизация: локальное ${currentTime}, серверное ${serverTime}, разница ${timeDifference.toFixed(
    //     2
    //   )}с`
    // );

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

  // Очистка таймаутов при размонтировании компонента
  useEffect(() => {
    return () => {
      if (playPauseDebounceTimeoutRef.current) {
        clearTimeout(playPauseDebounceTimeoutRef.current);
      }
    };
  }, []);

  /*
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
    // Игнорирует апдейты, приходящие чаще 2 секунд, стабилизируя синхронизацию
    if (now - lastServerUpdateRef.current < 2000) {
      console.log("Пропускаем обновление (слишком частое)");
      return;
    }
    lastServerUpdateRef.current = now;

    const player = playerRef.current;
    const currentTime = player?.getCurrentTime?.() || 0;
    const serverTime = videoState?.currentTime || 0;
    const timeDifference = serverTime - currentTime;

    console.log(
      `Синхронизация: локальное ${currentTime}, серверное ${serverTime}, разница ${timeDifference.toFixed(
        2
      )}с`
    );

    const isSeeking = player?.getIsSeeking() || false; // Получаем состояние перемотки

    // Добавляем проверку на недавнюю ручную перемотку (5 секунд)
    const wasRecentlyManuallySeek =
      window.lastManualSeekTime && now - window.lastManualSeekTime < 5000;

    // Сначала обработать синхронизацию времени
    // Проверка на расскождение текущего времени на клиенте с серверным
    // Если разница больше 3 секунд (> 3), происходит принудительная перемотка (seekTo) к времени сервера
    // isSeekingRef: Блокирует синхронизацию во время перемотки, предотвращая конфликты. Сбрасывается через 2 секунды, давая время на стабилизацию

    // Управляйте синхронизацией времени с помощью различных стратегий, основанных на разнице во времени
    // if (player && !isSeekingRef.current && !roomData.isPaused) {
    if (player && !isSeeking && !wasRecentlyManuallySeek) {
      console.log(`Пытаемся синхронизировать: ${currentTime} -> ${serverTime}`);

      // Большая разница во времени: используем перемотку при промежутках более 8 секунд
      if (Math.abs(timeDifference) > 8) {
        console.log(
          `Большое расхождение (${timeDifference.toFixed(
            2
          )}с): применяем прямую перемотку с ${currentTime} на ${serverTime}`
        );
        player.seekTo(serverTime, "seconds");

        // // Сбрасываем флаг перемотки через короткое время
        // setTimeout(() => {
        //   // Сбросить скорость всопроизведения после премотки
        //   if (player.setPlaybackRate) {
        //     player.setPlaybackRate(1);
        //   }
        // }, 2000);
      } else if (Math.abs(timeDifference) > 3) {
        // Рассчитываем соответствующую частоту воспроизведения (от 0,25x до 1,75x)
        // Положительная разница означает, что нам нужно ускорить воспроизведение, отрицательная - замедлить
        const adjustmentFactor = timeDifference > 0 ? 1.25 : 0.75;

        if (player.setPlaybackRate) {
          player.setPlaybackRate(adjustmentFactor);

          // Возврат к обычной скорости (1,0x) воспроизведения через некоторое время
          // Продолжительность тайм-аута зависит от того, сколько времени потребуется для восстановления
          const catchupTime =
            Math.abs(timeDifference) / Math.abs(1 - adjustmentFactor);
          const timeoutDuration = Math.min(catchupTime * 1000, 8000); // Ограничение в 8 секунд

          setTimeout(() => {
            if (player.setPlaybackRate) {
              console.log("Возвращаем нормальную скорость воспроизведения");
              player.setPlaybackRate(1);
            }
          }, timeoutDuration);
        }
      } else if (Math.abs(timeDifference) > 1) {
        // Очень маленькая разница во времени: Никаких корректировок скорости не требуется
        // Нормальная скорость
        console.log(
          "Очень маленькая разница во времени (1-3 сек.): Никаких корректировок скорости не требуется"
        );
        if (player.setPlaybackRate) {
          player.setPlaybackRate(1);
        }
      }
      // } else if (Math.abs(timeDifference) > 1) {
      //   // Тонкая регулировка (от 0,9 до 1,1)
      //   const subtleAdjustment = timeDifference > 0 ? 1.1 : 0.9;

      //   console.log(
      //     `Небольшое расхождение (${timeDifference.toFixed(
      //       2
      //     )}с): плавно корректируем скорость до ${subtleAdjustment}x`
      //   );

      //   if (player.setPlaybackRate) {
      //     player.setPlaybackRate(subtleAdjustment);

      //     // Возврат к нормальной скорости через короткий промежуток времени
      //     setTimeout(() => {
      //       if (player.setPlaybackRate) {
      //         console.log("Возвращаем нормальную скорость воспроизведения");
      //         player.setPlaybackRate(1);
      //       }
      //     }, 5000); // 5 секунд воспроизведения с изменённой скоростью
      //   }

      // // Очень маленькая разница во времени: Никаких корректировок скорости не требуется
      // else if (Math.abs(timeDifference) > 1) {
      //   // Нормальная скорость
      //   if (player.setPlaybackRate) {
      //     player.setPlaybackRate(1);
      //   }
      // }
    }

    // Если изменение инициировано сервером
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

      // Обновляйте состояние только в том случае, если что-то изменилось
      if (videoIdChanged || isPausedChanged || timeChanged || videoChanged) {
        return {
          ...prev,
          currentVideoId: videoState.currentVideoId || null,
          isPaused: videoState.isPaused ?? true,
          currentTime: videoState.currentTime || 0,
          currentVideo: newVideo,
        };
      }

      // Вовзрат предыдущего состояния, если ничего не изменилось
      return prev;
    });
  };
  */

  // Обработчик отправки сообщения
  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const message = input.value.trim(); // возвращает строку с вырезанными пробельными символами с её концов

    if (message && userInfo) {
      try {
        await connectionRef.current.sendMessage(
          roomId,
          userInfo.userId,
          userInfo.username,
          message
        );
        input.value = "";
        input.focus();
      } catch (error) {
        console.error("Ошибка при отправке сообщения:", error);
      }
    }
  };

  // Функция для форматирования времени сообщения
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="main-content2">
      {/* Левая колонка: Видео-плеер */}
      <section className="video-section">
        {roomData?.currentVideo?.videoId ? (
          <>
            <VideoPlayer
              ref={playerRef}
              roomId={roomId}
              currentVideoId={roomData.currentVideo.videoId}
              playing={!roomData.isPaused}
              currentTime={roomData.currentTime}
              onVideoAdded={() => setIsAddVideoModalOpen(true)}
              onPlayPause={handlePlayPause}
              onTimeUpdate={handleTimeUpdate}
            />
            {/* Кнопка закрытия плеера */}
            <button
              id="close-video-btn"
              className="btn"
              onClick={handleCloseVideo}
            >
              Закрыть
            </button>
          </>
        ) : (
          <button
            id="add-video-btn"
            className="btn"
            onClick={() => setIsAddVideoModalOpen(true)}
          >
            +
          </button>
        )}
        {/* Модалка добавления видео */}
        {isAddVideoModalOpen && (
          <AddVideoModal
            videoUrl={videoUrl}
            tempMetadata={tempMetadata}
            onUrlChange={setVideoUrl}
            onMetadataChange={setTempMetadata}
            onClose={closeAddVideoModal}
            onSubmit={(videoId) => {
              handleAddVideoModal(videoId); // Обновляем текущее видео
            }}
          />
        )}
      </section>

      {/* Правая колонка: Чат */}
      <section className="chat-section">
        <div className="chat-toolbar">
          {/* Ссылка-приглашение */}
          <button
            className="btn"
            id="invite-btn"
            onClick={() => setIsInviteModalOpen(true)}
          >
            Invite
          </button>

          {/* Список участников */}
          <div className="participants-container">
            <div
              className="participants-header"
              onClick={() => setShowParticipants(!showParticipants)}
            >
              Участники ({roomData?.participants?.length || 0})
              <span className="toggle-participants">
                {showParticipants ? "▲" : "▼"}
              </span>
            </div>

            {showParticipants && (
              <ul className="participants-list">
                {roomData?.participants?.map((participant) => (
                  <li
                    key={participant.userId}
                    className={
                      participant.userId === userInfo?.userId
                        ? "current-user"
                        : ""
                    }
                  >
                    {participant.username}
                    {participant.userId === userInfo?.userId && " (вы)"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Модалка приглашения */}
        {isInviteModalOpen && (
          <div
            className="modal"
            id="modal"
            onClick={handleCloseModal}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                mouseDownOnContentRef.current = false;
              }
            }}
          >
            <div
              className="modal-content"
              onMouseDown={() => {
                mouseDownOnContentRef.current = true;
              }}
            >
              <h2>Invite Link</h2>
              <div className="link-container">
                <span id="inviteLink">{roomData?.invitationLink}</span>
                <button id="copy-btn" onClick={handleCopy}>
                  Copy
                </button>
              </div>
              {showNotification && (
                <div id="notification" className="notification">
                  Copied to clipboard!
                </div>
              )}
            </div>
          </div>
        )}
        {/* Отображение состояния соединения */}
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === "connected" && <span>✓ Подключено</span>}
          {connectionStatus === "reconnecting" && (
            <span>⟳ Переподключение...</span>
          )}
          {connectionStatus === "disconnected" && (
            <div>
              <span>✕ Соединение потеряно</span>
              <button onClick={handleManualReconnect}>Переподключиться</button>
            </div>
          )}
          {connectionStatus === "error" && (
            <div>
              <span>✕ Ошибка соединения</span>
              <button onClick={handleManualReconnect}>Попробовать снова</button>
            </div>
          )}
        </div>

        {/* Кнопка выхода из комнаты, использующая переданную функцию */}
        {onLeaveRoom && (
          <button onClick={onLeaveRoom} className="leave-button">
            Выйти из комнаты
          </button>
        )}

        <div id="chat-messages" className="messages-container">
          {/* Сообщения чата */}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isSystem ? "system-message" : ""} ${
                msg.userId === userInfo?.userId ? "own-message" : ""
              }`}
            >
              <div className="message-header">
                <span className="message-username">
                  <strong>{msg.userName}:</strong>
                </span>
                {msg.timestamp && (
                  <span className="message-timestamp">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                )}
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Элемент для автопрокрутки */}
        </div>

        <form id="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            id="chat-input"
            name="chatInput"
            placeholder="Введите сообщение..."
            autoComplete="off" // отключить автозаполнение (логины, пароли и т.д.)
          />
          <button type="submit" className="btn">
            Отправить
          </button>
        </form>

        {/* Модалка настроек комнаты, при нажатии на шестеренку */}
        {isSettingsModalOpen && (
          <div
            className="modal"
            id="settings-modal"
            onClick={handleCloseModal}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                mouseDownOnContentRef.current = false;
              }
            }}
          >
            <div
              className="modal-content"
              onMouseDown={() => {
                mouseDownOnContentRef.current = true;
              }}
            >
              <h2>Настройки комнаты</h2>
              <div className="form-group">
                <label htmlFor="room-name-input">Название комнаты:</label>
                <input
                  id="room-name-input"
                  value={roomData?.roomName}
                  {...INPUT_PROPS}
                  onChange={(e) =>
                    setRoomData((prev) => ({
                      ...prev,
                      roomName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="room-description-input">Описание:</label>
                <textarea
                  id="room-description-input"
                  value={roomData?.description}
                  {...INPUT_PROPS}
                  onChange={(e) =>
                    setRoomData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="modal-buttons">
                <button
                  className="btn"
                  id="save-settings-btn"
                  onClick={handleSaveSettings}
                >
                  Сохранить
                </button>
                <button
                  className="btn"
                  id="cancel-settings-btn"
                  onClick={onSettingsClose}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
