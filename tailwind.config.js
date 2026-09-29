/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7faf9',
          100: '#eef4f2',
          200: '#d8e4e0',
          300: '#b3c7c0',
          400: '#7d9a92',
          500: '#57756c',
          600: '#3f5b54',
          700: '#314a44',
          800: '#233733',
          900: '#182826',
          950: '#0f1c1a',
        },
        emerald: {
          DEFAULT: '#10b981',
        },
        teal: {
          DEFAULT: '#14b8a6',
        },
        risk: {
          low: '#10b981',
          med: '#f59e0b',
          high: '#f97316',
          crit: '#ef4444',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,40,38,0.04), 0 4px 16px rgba(16,40,38,0.06)',
        cardHover: '0 4px 8px rgba(16,40,38,0.06), 0 12px 28px rgba(16,40,38,0.10)',
        glow: '0 0 0 1px rgba(16,185,129,0.25), 0 0 24px rgba(16,185,129,0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        dash: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-40' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        dash: 'dash 1s linear infinite',
      },
    },
  },
  plugins: [],
};
