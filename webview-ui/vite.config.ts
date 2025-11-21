import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  server: {
    origin: 'http://127.0.0.1:5173',
    port: 5173,
    strictPort: true,
    host: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    hmr: {
      overlay: false,
    },
  },
});
