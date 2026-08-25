/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Mirrors shared/constants/index.js ZONE_COLOR_HEX exactly - never
        // redefine risk-zone colors anywhere else in the app.
        zone: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#CA8A04',
          green: '#16A34A'
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f1f4d'
        }
      }
    }
  },
  plugins: []
};
