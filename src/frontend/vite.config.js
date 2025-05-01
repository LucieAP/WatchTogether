import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Порт API по умолчанию:
// - Локальный запуск: 7143 (устанавливается в .env или через npm run dev:local)
// - Docker: 5000 (устанавливается через npm run dev:docker)

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    plugins: [react(), basicSsl()], // basicSsl - для https
    server: isDevelopment
      ? {
          proxy: {
            "/api": {
              target: process.env.VITE_API_URL || "http://localhost:7143",
              secure: false,
              changeOrigin: true,
            },
            "/mediaHub": {
              target: process.env.VITE_API_URL || "http://localhost:7143",
              secure: false,
              ws: true, // Включаем WebSocket для SignalR
              changeOrigin: true,
            },
          },
        }
      : {},
    define: {
      "process.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL),
    },
  };
});
