/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#000000', // Vampire Mode Base
        surface: '#121212',    // Cards
        primary: '#E0E0E0',    // Main Text
        accent: '#FF453A',     // Critical Actions (Record)
        success: '#32D74B',    // Good results
      },
      fontFamily: {
        // Если будем добавлять кастомные шрифты позже
      }
    },
  },
  plugins: [],
}