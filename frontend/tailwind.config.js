/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nhận diện ApartmentDN (logo): navy nền, vàng điểm nhấn — vàng chỉ dùng trên nền navy (tương phản ~6.8:1), không làm chữ trên nền trắng
        brand: {
          navy: '#0f2a45',
          'navy-soft': '#1b3d63',
          gold: '#d4a94f',
          'gold-light': '#f1d999',
        },
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

