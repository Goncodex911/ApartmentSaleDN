/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens (Story 12.1) — dùng tên theo VAI TRÒ thay vì tên màu:
        // navy = thương hiệu / chữ cấp 1; accent = hành động chính, tab đang chọn, viền focus;
        // gold = điểm nhấn cao cấp — CHỈ dùng trên nền navy (tương phản ~6.8:1), không làm chữ trên nền trắng
        brand: {
          navy: '#0f2a45',
          'navy-soft': '#1b3d63',
          accent: '#4f46e5',
          'accent-dark': '#4338ca',
          gold: '#d4a94f',
          'gold-light': '#f1d999',
        },
        // Nền phân cấp: 0 = thẻ / hộp thoại, 1 = nền trang, 2 = khối phụ (chip, ô xám)
        surface: {
          0: '#ffffff',
          1: '#f8fafc',
          2: '#f1f5f9',
        },
        // Giữ cho code cũ (trước Story 12.1) — trùng giá trị với brand.accent
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [],
};
