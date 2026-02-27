import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone el servidor a la red (0.0.0.0)
    allowedHosts: true, // Permite cualquier host (incluido ngrok)
    hmr: false, // Deshabilitar HMR para evitar bloqueos via ngrok en móviles
  },
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
});
