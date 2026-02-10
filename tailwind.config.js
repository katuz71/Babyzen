/** @type {import('tailwindcss').Config} */
module.exports = {
  // ИСПРАВЛЕНО: Добавлен пресет для NativeWind v4
  presets: [require("nativewind/preset")], 
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#121212',
        primary: '#E0E0E0',
        accent: '#FF453A',
        success: '#32D74B',
      },
    },
  },
  plugins: [],
}