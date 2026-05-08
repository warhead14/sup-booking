/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          base: '#00B8D4',
          hover: '#33C6DD',
          active: '#00A3BD',
          light: '#E6F8FB'
        },
        main: '#FAFAFA',
      }
    },
  },
  plugins: [],
}
