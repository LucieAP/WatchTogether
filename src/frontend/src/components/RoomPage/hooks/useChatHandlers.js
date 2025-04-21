import { useState, useCallback, useMemo } from "react";
import { formatChatHistory } from "../utils/chatHelpers";

export function useChatHandlers() {
  const [messages, setMessages] = useState([]);

  // Используем useCallback для мемоизации обработчика новых сообщений
  const handleNewMessage = useCallback((message) => {
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
  }, []);

  // Мемоизируем обработчик получения истории чата
  const handleChatHistory = useCallback((history) => {
    // Преобразуем историю в формат, используемый в компоненте
    const formattedHistory = formatChatHistory(history);

    setMessages(formattedHistory);
    console.log("Получена история сообщений:", formattedHistory);
  }, []);

  // Мемоизируем возвращаемый объект
  return useMemo(
    () => ({
      messages,
      setMessages,
      handleNewMessage,
      handleChatHistory,
    }),
    [messages, handleNewMessage, handleChatHistory]
  );
}
