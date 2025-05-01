import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Порт API по умолчанию:
// - Локальный запуск: 7143 (устанавливается в .env или через npm run dev:local)
// - Docker: 5000 (устанавливается через npm run dev:docker)
// const apiPort = process.env.API_PORT || "5000";
// console.log(`API будет доступен по адресу: http://localhost:${apiPort}`);

const apiBaseUrl = process.env.VITE_API_URL;
console.log(`API будет доступен по адресу: ${apiBaseUrl}`);

export default defineConfig({
  plugins: [react(), basicSsl()], // basicSsl - для https
  server: {
    proxy: {
      "/api": {
        // target: "http://localhost:5000",
        // target: `http://localhost:${apiPort}`,
        // target: "http://localhost:7143",
        target: apiBaseUrl,
        secure: false, // отключить проверку самоподписанного сертификата https
        changeOrigin: true,
      },
      "/mediaHub": {
        // target: "http://localhost:5000",
        // target: `http://localhost:${apiPort}`,
        target: apiBaseUrl,
        secure: false,
        ws: true, // Включаем WebSocket для SignalR
        changeOrigin: true,
      },
    },
  },
});
