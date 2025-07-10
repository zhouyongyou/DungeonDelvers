/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- 【新】啟用 class 策略  
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
      colors: {
        // 魔幻金色系
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // 稀有度色彩
        rarity: {
          common: '#9ca3af',
          uncommon: '#10b981',
          rare: '#3b82f6',
          epic: '#8b5cf6',
          legendary: '#f59e0b',
          mythic: '#ec4899',
        },
      },
      keyframes: {
        'slide-in-right': { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'zoom-in': { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-left': { '0%': { opacity: '0', transform: 'translateX(-100%)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'bounce-in': { '0%': { opacity: '0', transform: 'scale(0.3)' }, '50%': { opacity: '1', transform: 'scale(1.05)' }, '70%': { transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'shimmer': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        'glow': { '0%, 100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }, '50%': { boxShadow: '0 0 30px rgba(251, 191, 36, 0.6)' } },
        'float': { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        'elastic': { '0%': { transform: 'scale(0)' }, '50%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)' } },
        'wobble': { '0%': { transform: 'translateX(0%)' }, '15%': { transform: 'translateX(-25%) rotate(-5deg)' }, '30%': { transform: 'translateX(20%) rotate(3deg)' }, '45%': { transform: 'translateX(-15%) rotate(-3deg)' }, '60%': { transform: 'translateX(10%) rotate(2deg)' }, '75%': { transform: 'translateX(-5%) rotate(-1deg)' }, '100%': { transform: 'translateX(0%)' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
        'zoom-in': 'zoom-in 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'elastic': 'elastic 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'wobble': 'wobble 1s ease-in-out',
      },
      textShadow: {
        'gold': '1px 1px 3px rgba(252, 211, 77, 0.7)',
        'glow': '0 0 10px currentColor',
        'outline': '1px 1px 0px rgba(0,0,0,0.8)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(251, 191, 36, 0.3)',
        'rarity': '0 0 30px currentColor',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
        const newUtilities = {};
        Object.entries(theme('textShadow')).forEach(([key, value]) => { newUtilities[`.text-shadow-${key}`] = { textShadow: value }; });
        addUtilities(newUtilities);
    },
    function ({ addUtilities }) {
      addUtilities({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.2)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.interactive': {
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          'cursor': 'pointer',
        },
        '.interactive:hover': {
          'transform': 'translateY(-2px)',
          'box-shadow': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        '.interactive:active': {
          'transform': 'translateY(0)',
          'transition-duration': '0.15s',
        },
        '.card-enhanced': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'border-radius': '0.75rem',
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.card-enhanced::before': {
          'content': '""',
          'position': 'absolute',
          'top': '0',
          'left': '-100%',
          'width': '100%',
          'height': '100%',
          'background': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
          'transition': 'left 0.5s cubic-bezier(0, 0, 0.2, 1)',
        },
        '.card-enhanced:hover::before': {
          'left': '100%',
        },
        '.card-enhanced:hover': {
          'background': 'rgba(255, 255, 255, 0.08)',
          'transform': 'translateY(-2px)',
          'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
        '.rarity-common': {
          'border-color': '#9ca3af',
          'box-shadow': '0 0 10px rgba(156, 163, 175, 0.2)',
        },
        '.rarity-uncommon': {
          'border-color': '#10b981',
          'box-shadow': '0 0 10px rgba(16, 185, 129, 0.2)',
        },
        '.rarity-rare': {
          'border-color': '#3b82f6',
          'box-shadow': '0 0 10px rgba(59, 130, 246, 0.2)',
        },
        '.rarity-epic': {
          'border-color': '#8b5cf6',
          'box-shadow': '0 0 10px rgba(139, 92, 246, 0.2)',
        },
        '.rarity-legendary': {
          'border-color': '#f59e0b',
          'box-shadow': '0 0 10px rgba(245, 158, 11, 0.2)',
          'animation': 'glow 2s ease-in-out infinite alternate',
        },
        '.rarity-mythic': {
          'border-color': '#ec4899',
          'box-shadow': '0 0 10px rgba(236, 72, 153, 0.2)',
          'animation': 'glow 2s ease-in-out infinite alternate',
        },
      });
    },
  ],
}