import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()], // basicSsl - для https
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        secure: false, // отключить проверку самоподписанного сертификата https
        changeOrigin: true,
      },
      "/mediaHub": {
        target: "http://localhost:5000",
        secure: false,
        ws: true, // Включаем WebSocket для SignalR
        changeOrigin: true,
      },
    },
  },
});
