// RoomPage.jsx:
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { VideoSection } from "./VideoSection/VideoSection";
import { ChatSection } from "./ChatSection/ChatSection";
import { SettingsModal } from "./Modals/SettingsModal";
import useSignalRConnection from "./hooks/useSignalRConnection";
import { useVideoSync } from "./hooks/useVideoSync";
import { useVideoManagement } from "./hooks/useVideoManagement";
import { useRoomSettings } from "./hooks/useRoomSettings";
import { useChatHandlers } from "./hooks/useChatHandlers";
import { useConnectionHandlers } from "./hooks/useConnectionHandlers";
import {
  leaveRoom,
  handleManualLeave,
  setupBrowserCloseHandler,
  handleNetworkDisconnect,
} from "../../api/leaveRoomAction";

export default function RoomPage({
  isSettingsModalOpen,
  onSettingsClose,
  roomData: initialRoomData,
  refetchRoomData,
}) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  // Отслеживаем взаимодействие с мышью, чтобы решить проблему закрытия модального окна при копировании текста и выходе курсора за его границы
  const mouseDownOnContentRef = useRef(false);

  const { roomId } = useParams();
  const playerRef = useRef(null); // Ref для получения методов плеер проброшенного из VideoPlayer.jsx

  const navigate = useNavigate();
  const { isLoggedIn, isGuest } = useAuth();

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

  /* Проверка авторизации при загрузке компонента */
  useEffect(() => {
    if (!isLoggedIn && !isGuest) {
      navigate("/"); // Перенаправляем на главную страницу, если пользователь не авторизован и не гость
    }
  }, [isLoggedIn, isGuest, navigate]);

  /* Логирование изменений текущего видео */
  useEffect(() => {
    console.log(
      "Текущее видео изменилось:",
      roomData.currentVideoId,
      roomData.currentVideo
    );
  }, [roomData.currentVideoId]);

  /* Синхронизируем только при изменении initialRoomData */
  useEffect(() => {
    if (initialRoomData) {
      setRoomData((prev) => ({
        ...prev,
        ...initialRoomData,
      }));
    }
  }, [initialRoomData]);

  // Инициализация хуков
  const {
    videoUrl,
    setVideoUrl,
    tempMetadata,
    setTempMetadata,
    isAddVideoModalOpen,
    setIsAddVideoModalOpen,
    handleAddVideoModal,
    handleCloseVideo,
  } = useVideoManagement(roomId, setRoomData);

  const { handleSaveSettings } = useRoomSettings(
    roomId,
    setRoomData,
    refetchRoomData,
    onSettingsClose
  );

  const { messages, setMessages, handleNewMessage, handleChatHistory } =
    useChatHandlers();

  const { handleConnectionStateChanged, handleParticipantsUpdated } =
    useConnectionHandlers(roomId, setRoomData, handleNetworkDisconnect);

  // Закрытие модалок при клике на фон - мемоизируем эту функцию
  const handleCloseModal = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !mouseDownOnContentRef.current) {
        setIsInviteModalOpen(false);
        setIsAddVideoModalOpen(false);
        onSettingsClose();
      }
      mouseDownOnContentRef.current = false;
    },
    [
      mouseDownOnContentRef,
      setIsInviteModalOpen,
      setIsAddVideoModalOpen,
      onSettingsClose,
    ]
  );

  // Используем хук синхронизации видео
  const {
    handleTimeUpdate,
    handlePlayPause,
    handleVideoStateUpdated,
    playPauseDebounceTimeoutRef,
  } = useVideoSync(roomId, roomData, setRoomData, playerRef);

  // Хук для подключения к SignalR
  const { userInfo, connectionStatus, connectionRef, handleManualReconnect } =
    useSignalRConnection(
      roomId,
      handleNewMessage,
      handleParticipantsUpdated,
      handleChatHistory,
      handleVideoStateUpdated,
      handleConnectionStateChanged,
      setupBrowserCloseHandler
    );

  /* Очистка таймаутов при размонтировании компонента */
  useEffect(() => {
    return () => {
      if (playPauseDebounceTimeoutRef.current) {
        clearTimeout(playPauseDebounceTimeoutRef.current);
      }
    };
  }, []);

  // Мемоизируем VideoSection для предотвращения ненужных ререндеров
  const memoizedVideoSection = useMemo(
    () => (
      <VideoSection
        roomId={roomId}
        roomData={roomData}
        playerRef={playerRef}
        handlePlayPause={handlePlayPause}
        handleTimeUpdate={handleTimeUpdate}
        handleCloseVideo={handleCloseVideo}
        videoUrl={videoUrl}
        tempMetadata={tempMetadata}
        setVideoUrl={setVideoUrl}
        setTempMetadata={setTempMetadata}
        handleAddVideoModal={handleAddVideoModal}
        isAddVideoModalOpen={isAddVideoModalOpen}
        setIsAddVideoModalOpen={setIsAddVideoModalOpen}
      />
    ),
    [
      roomId,
      roomData,
      handlePlayPause,
      handleTimeUpdate,
      handleCloseVideo,
      videoUrl,
      tempMetadata,
      setVideoUrl,
      setTempMetadata,
      handleAddVideoModal,
      isAddVideoModalOpen,
      setIsAddVideoModalOpen,
    ]
  );

  // Мемоизируем ChatSection
  const memoizedChatSection = useMemo(
    () => (
      <ChatSection
        roomId={roomId}
        roomData={roomData}
        userInfo={userInfo}
        messages={messages}
        setMessages={setMessages}
        connectionRef={connectionRef}
        connectionStatus={connectionStatus}
        isInviteModalOpen={isInviteModalOpen}
        setIsInviteModalOpen={setIsInviteModalOpen}
        mouseDownOnContentRef={mouseDownOnContentRef}
        handleManualReconnect={handleManualReconnect}
        handleCloseModal={handleCloseModal}
        handleManualLeave={handleManualLeave}
        navigate={navigate}
      />
    ),
    [
      roomId,
      roomData,
      userInfo,
      messages,
      connectionRef,
      connectionStatus,
      isInviteModalOpen,
      handleManualReconnect,
      handleCloseModal,
      navigate,
    ]
  );

  // Мемоизируем SettingsModal
  const memoizedSettingsModal = useMemo(
    () => (
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveSettings}
        onSettingsClose={onSettingsClose}
        mouseDownOnContentRef={mouseDownOnContentRef}
        roomName={roomData?.roomName}
        description={roomData?.description}
      />
    ),
    [
      isSettingsModalOpen,
      handleCloseModal,
      handleSaveSettings,
      onSettingsClose,
      roomData?.roomName,
      roomData?.description,
    ]
  );

  return (
    <main className="room-container">
      {/* Видео-плеер */}
      {memoizedVideoSection}

      {/* Чат */}
      {memoizedChatSection}

      {/* Модалка настроек комнаты, при нажатии на шестеренку */}
      {memoizedSettingsModal}
    </main>
  );
}
