/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        academic: {
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#1e293b',
          900: '#0f172a',
        },
        farv: {
          primary: '#8b2635',
          secondary: '#d97706',
          dark: '#1c1917',
        }
      }
    },
  },
  plugins: [],
}
