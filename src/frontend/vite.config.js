import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()], // basicSsl - для https
  server: {
    proxy: {
      "/api": {
        target: import.meta.env.VITE_API_URL,
        secure: false, // отключить проверку самоподписанного сертификата https
      },
    },
  },
});
