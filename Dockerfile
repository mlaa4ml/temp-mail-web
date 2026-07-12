# syntax=docker/dockerfile:1.6

# ===== Stage 1: Сборка =====
FROM node:20-alpine AS builder
WORKDIR /app

# Кешируем слой зависимостей
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Копируем исходники и собираем
COPY . .
RUN npm run build

# ===== Stage 2: Раздача через nginx =====
FROM nginx:1.27-alpine AS runtime

# Конфиг SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Статика из builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck (Railway / Docker могут опрашивать)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]