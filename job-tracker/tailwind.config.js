/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
        },
        track: {
          950: '#0c0f1a',
          900: '#111827',
          800: '#1e293b',
          700: '#334155',
          accent: '#0284c7',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(15, 23, 42, 0.08)',
        glow: '0 0 0 1px rgba(14, 165, 233, 0.12), 0 8px 32px -8px rgba(14, 165, 233, 0.2)',
      },
    },
  },
  plugins: [],
}
