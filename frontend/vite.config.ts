import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const NAVY = '#0f2a45'; // Màu nền logo ApartmentDN

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Story 9.1: cài app ra màn hình chính + xem kho ngoại tuyến
    VitePWA({
      registerType: 'prompt', // Có bản mới → hỏi người dùng (không tự tải lại giữa lúc đang nhập form)
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-64.png'],
      manifest: {
        name: 'ApartmentDN - Kho Căn Hộ Cho Thuê',
        short_name: 'ApartmentDN',
        description: 'Kho căn hộ cho thuê Đà Nẵng cho CTV và Quản lý',
        lang: 'vi',
        start_url: '/apartments',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: NAVY,
        background_color: NAVY,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Ảnh căn đã xem 1 lần → mở tức thì, tiết kiệm 4G (tối đa 50 ảnh gần nhất)
            urlPattern: ({ url }) => url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'apartment-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Bảng hàng: ưu tiên mạng, mất mạng (hoặc chờ quá 4 giây) → bản đã lưu. Tên cache dùng chung với utils/offlineCache.ts
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /^\/api\/v1\/apartments(\/search)?\/?$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-apartments',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
