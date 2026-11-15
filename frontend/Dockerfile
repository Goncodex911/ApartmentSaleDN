# Frontend cho môi trường Docker (chạy thử trên máy / deploy VPS). Netlify KHÔNG dùng file này.

# ---- Tầng 1: build React (Vite) ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Tầng 2: Nginx phục vụ file tĩnh + chuyển tiếp /api sang Backend ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
