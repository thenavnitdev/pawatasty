/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        '3xl': '2rem',
      },
      colors: {
        orange: {
          50: '#FFF5F0',
          100: '#FFE8DC',
          200: '#FFD1B9',
          300: '#FFB996',
          400: '#FFA374',
          500: '#FFA374',
          600: '#FF8C5C',
          700: '#FF7544',
          800: '#FF5E2C',
          900: '#FF4714',
        },
      },
      animation: {
        'bounce-once': 'bounce-once 0.6s ease-in-out',
      },
      keyframes: {
        'bounce-once': {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.1)' },
          '75%': { transform: 'scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
};
