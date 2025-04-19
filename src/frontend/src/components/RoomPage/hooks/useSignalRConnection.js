import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { createConnection } from "../../../api/media";
import * as signalR from "@microsoft/signalr";

const useSignalRConnection = (
  roomId,
  handleNewMessage,
  handleParticipantsUpdated,
  handleChatHistory,
  handleVideoStateUpdated,
  handleConnectionStateChanged,
  setupBrowserCloseHandler
) => {
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
  });
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const connectionRef = useRef(null);

  // Загрузка данных комнаты и подключение к чату
  useEffect(() => {
    // Проверяем, нет ли уже активного подключения
    if (
      connectionRef.current?.connection &&
      connectionRef.current.connection.state ===
        signalR.HubConnectionState.Connected
    ) {
      console.log(
        "Соединение уже установлено, пропускаем повторное подключение"
      );
      return;
    }

    const setupChat = async () => {
      try {
        // Проверяем, есть ли сохраненный userId для этой комнаты
        const savedUserInfo = sessionStorage.getItem(`room_${roomId}_user`);
        let userInfoData;

        if (savedUserInfo) {
          try {
            userInfoData = JSON.parse(savedUserInfo);
            console.log(
              "Использование сохраненных данных пользователя:",
              userInfoData
            );
            setUserInfo(userInfoData);
          } catch (e) {
            console.error(
              "Ошибка при разборе сохраненных данных пользователя:",
              e
            );
          }
        }

        if (!userInfoData) {
          // Если нет сохраненных данных, выполняем запрос к API
          const joinResponse = await axios.post(`/api/Rooms/${roomId}/join`);
          console.log("Join response data:", joinResponse.data);

          userInfoData = {
            userId: joinResponse.data.userId,
            username: joinResponse.data.username,
          };

          setUserInfo(userInfoData);

          // Сохраняем данные пользователя для этой комнаты
          sessionStorage.setItem(
            `room_${roomId}_user`,
            JSON.stringify(userInfoData)
          );
        }

        // Создаем внутренний обработчик изменения состояния соединения
        // Обновляет внутреннее состояние соединения через setConnectionStatus,
        // Вызывает внешний обработчик из компонента RoomPage, если он был предоставлен
        const internalHandleConnectionStateChanged = (state, error) => {
          console.log(`Connection state changed to: ${state}`, error);
          setConnectionStatus(state);

          // Вызываем внешний обработчик, если он был предоставлен
          if (handleConnectionStateChanged) {
            handleConnectionStateChanged(state, error);
          }
        };

        // Подключаемся к SignalR
        const { connection, start, sendMessage, checkConnection, reconnect } =
          createConnection(
            roomId,
            handleNewMessage,
            handleParticipantsUpdated,
            handleChatHistory,
            userInfoData.username,
            userInfoData.userId,
            handleVideoStateUpdated,
            internalHandleConnectionStateChanged
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
    const cleanupBrowserClose = setupBrowserCloseHandler(roomId, connectionRef);

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

    return () => {
      // Очищаем все интервалы и обработчики событий
      cleanupBrowserClose();
      clearInterval(pingInterval); // 1. Останавливает ping-проверки

      // 2. Проверяет наличие соединения
      if (connectionRef.current?.connection) {
        connectionRef.current.connection.stop(); // 3. Корректно останавливает SignalR соединение
      }
    };
  }, [roomId]);

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

  return { userInfo, connectionStatus, connectionRef, handleManualReconnect };
};

export default useSignalRConnection;
