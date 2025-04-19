import { useState } from "react";
import { formatChatHistory } from "../utils/chatHelpers";

export function useChatHandlers() {
  const [messages, setMessages] = useState([]);

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

  // Обработчик получения истории чата
  const handleChatHistory = (history) => {
    // Преобразуем историю в формат, используемый в компоненте
    const formattedHistory = formatChatHistory(history);

    setMessages(formattedHistory);
    console.log("Получена история сообщений:", formattedHistory);
  };

  return {
    messages,
    setMessages,
    handleNewMessage,
    handleChatHistory,
  };
}
