/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{vue,ts,tsx}",
    "./.vite/renderer/**/*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
