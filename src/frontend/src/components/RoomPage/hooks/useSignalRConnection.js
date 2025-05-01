import { useState, useEffect, useRef } from "react";
import { apiClient } from "../../../api/client";
import { createConnection } from "../../../api/media";
import * as signalR from "@microsoft/signalr";
import { useConnection } from "../../../context/ConnectionContext";

import {
  setupBrowserCloseHandler,
  removeBeforeUnloadHandler,
} from "../../../api/leaveRoomAction";

const useSignalRConnection = (
  roomId,
  handleNewMessage,
  handleParticipantsUpdated,
  handleChatHistory,
  handleVideoStateUpdated,
  handleConnectionStateChanged
) => {
  const [userInfo, setUserInfo] = useState({
    userId: "",
    username: "",
  });

  // Получаем статус соединения и ссылку на соединение из глобального контекста
  const { connectionStatus, setConnectionStatus, connectionRef } =
    useConnection();

  // Добавляем флаг для отслеживания процесса подключения
  const isConnectingRef = useRef(false);
  // Добавляем флаг для отслеживания размонтирования компонента
  const isMountedRef = useRef(true);

  // Загрузка данных комнаты и подключение к чату
  useEffect(() => {
    // Устанавливаем флаг монтирования
    isMountedRef.current = true;

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

    // Проверяем, не идет ли процесс подключения сейчас
    if (isConnectingRef.current) {
      console.log("Процесс подключения уже запущен, пропускаем");
      return;
    }

    const setupChat = async () => {
      // Устанавливаем флаг, что начат процесс подключения
      isConnectingRef.current = true;

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
          const joinResponse = await apiClient.post(`Rooms/${roomId}/join`);
          console.log("Join response data:", joinResponse);

          userInfoData = {
            userId: joinResponse.userId,
            username: joinResponse.username,
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
          // Проверяем, монтирован ли еще компонент
          if (isMountedRef.current) {
            setConnectionStatus(state);

            // Вызываем внешний обработчик, если он был предоставлен
            if (handleConnectionStateChanged) {
              handleConnectionStateChanged(state, error);
            }
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

        // Проверяем, не размонтирован ли компонент за время асинхронной операции
        if (!isMountedRef.current) {
          console.log(
            "Компонент размонтирован до завершения подключения, прерываем"
          );
          return;
        }

        // Сохраняем методы соединения в глобальный контекст
        connectionRef.current = {
          connection,
          sendMessage,
          checkConnection,
          reconnect,
        };

        // Проверяем, не размонтирован ли компонент перед запуском соединения
        if (isMountedRef.current) {
          await start();
        }
      } catch (error) {
        console.error("Chat setup error:", error);
        if (isMountedRef.current) {
          setConnectionStatus("error");
        }
      } finally {
        // Сбрасываем флаг подключения в любом случае
        isConnectingRef.current = false;
      }
    };

    setupChat();

    // Настраиваем обработчик закрытия браузера/вкладки
    const cleanupBrowserClose = setupBrowserCloseHandler(roomId, connectionRef);

    // Запускает проверку каждые 30 секунд (30000 мс)
    // При каждом срабатывании выполняется проверка состояния соединения
    const pingInterval = setInterval(() => {
      if (
        isMountedRef.current && // Проверяем, не размонтирован ли компонент
        connectionRef.current?.checkConnection && // Проверка существование метода checkConnection
        !connectionRef.current.checkConnection() && // Вызываем метод, если false (соединение разорвано), если true то все норм
        !isConnectingRef.current // Проверяем, что процесс подключения не идет в данный момент
      ) {
        console.log("Connection check failed, attempting to reconnect");
        connectionRef.current?.reconnect?.();
      }
    }, 30000); // Проверка каждые 30 секунд

    return () => {
      // Устанавливаем флаг размонтирования компонента
      isMountedRef.current = false;

      // Очищаем все интервалы и обработчики событий
      cleanupBrowserClose(); // Удаляем обработчик beforeunload
      clearInterval(pingInterval); // Останавливает ping-проверки

      // Проверяем наличие соединения и то, что процесс установки соединения завершен
      if (connectionRef.current?.connection && !isConnectingRef.current) {
        connectionRef.current.connection.stop(); // Корректно останавливает SignalR соединение
      }
    };
  }, [roomId]);

  // Используем handleManualReconnect из контекста в компоненте RoomPage
  return { userInfo, connectionStatus };
};

export default useSignalRConnection;
