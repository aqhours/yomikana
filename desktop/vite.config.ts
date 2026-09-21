import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: "../public",
  plugins: [react(), wasm()],
  optimizeDeps: { exclude: ["@applemusic-like-lyrics/fft"] },
  server: { host: "127.0.0.1", port: 1420, strictPort: true },
  build: { outDir: "../dist-desktop", emptyOutDir: true, target: "es2022" },
});
