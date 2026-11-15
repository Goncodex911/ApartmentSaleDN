# Image chạy Backend trên Render (gói miễn phí) — build 2 tầng để image chạy thật gọn nhẹ

# ---- Tầng 1: build TypeScript (cần devDependencies) ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Tầng 2: image chạy ----
FROM node:22-bookworm-slim
# Font cho sharp/librsvg vẽ chữ watermark SĐT lên ảnh (Story 5.2) — thiếu font thì ảnh không có chữ
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core fontconfig \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Không chạy bằng root
USER node
# Render tự cấp biến PORT (mặc định 10000); chạy local thì dùng 5000
EXPOSE 10000
CMD ["node", "dist/server.js"]
