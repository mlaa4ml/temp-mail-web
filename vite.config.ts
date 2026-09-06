import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * База (public path) сборки.
 *
 * - Обычный деплой (Docker/nginx/Railway, свой домен) — корень сайта: "/".
 * - GitHub Pages в подкаталоге репозитория (https://<user>.github.io/<repo>/)
 *   требует base = "/<repo>/", иначе браузер запрашивает /assets/... с корня
 *   домена и получает 404 (или index.html с MIME "text/html").
 *
 * Значение можно задать переменной окружения BASE_PATH на этапе сборки:
 *   BASE_PATH=/temp-mail-web/ npm run build
 * В GitHub Actions это делается автоматически (см. .github/workflows/deploy.yml).
 */
const rawBase = process.env.BASE_PATH ?? process.env.VITE_BASE_PATH ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
  },
});
