/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // <--- ESTA ES LA LÍNEA MÁGICA
  theme: {
    extend: {},
  },
  plugins: [],
};
