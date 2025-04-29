import { createContext, useContext, useState, useRef } from "react";

// Создаем контекст соединения
export const ConnectionContext = createContext({
  connectionStatus: "disconnected", // connected/reconnecting/disconnected/error
  setConnectionStatus: () => {},
  connectionRef: null,
  handleManualReconnect: () => Promise.resolve(),
});

// Провайдер контекста соединения
export const ConnectionProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // connected/reconnecting/disconnected/error
  const connectionRef = useRef(null);

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
    } else {
      console.warn(
        "Попытка переподключения не удалась: connectionRef не инициализирован"
      );
    }
  };

  return (
    <ConnectionContext.Provider
      value={{
        connectionStatus,
        setConnectionStatus,
        connectionRef,
        handleManualReconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

// Хук для использования контекста соединения
export const useConnection = () => {
  const context = useContext(ConnectionContext);

  if (!context) {
    throw new Error(
      "useConnection должен использоваться внутри ConnectionProvider"
    );
  }

  return context;
};
