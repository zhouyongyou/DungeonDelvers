/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
      },
      keyframes: {
        'slide-in-right': { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'zoom-in': { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
        'zoom-in': 'zoom-in 0.3s ease-out forwards',
      },
      textShadow: {
        'gold': '1px 1px 3px rgba(252, 211, 77, 0.7)',
      },
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
        const newUtilities = {};
        Object.entries(theme('textShadow')).forEach(([key, value]) => { newUtilities[`.text-shadow-${key}`] = { textShadow: value }; });
        addUtilities(newUtilities);
    }
  ],
}