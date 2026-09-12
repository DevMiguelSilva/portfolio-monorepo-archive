/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#fafaf9',
          100: '#f5f5f4',
        },
        brand: {
          accent: '#0d9488',
          soft: '#f0fdfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(15, 23, 42, 0.08)',
        glow: '0 0 0 1px rgba(13, 148, 136, 0.1), 0 8px 32px -8px rgba(13, 148, 136, 0.22)',
      },
    },
  },
  plugins: [],
}
