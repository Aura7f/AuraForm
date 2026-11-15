/** @type {import('tailwindcss').Config} */
const forest = {
  50: '#f0f4f0',
  100: '#e2ebe4',
  200: '#cbd8cd',
  300: '#a7bba9',
  400: '#78957d',
  500: '#507456',
  600: '#315b45',
  700: '#294c3a',
  800: '#213d2e',
  900: '#1a3125',
  950: '#12231a',
};

const sand = {
  50: '#fcfbf8',
  100: '#f6f1e7',
  200: '#e9dfcf',
  300: '#d8c8a8',
  400: '#b49b72',
  500: '#76654d',
  600: '#62543f',
  700: '#4d4334',
  800: '#393328',
  900: '#28251f',
  950: '#1c1b17',
};

const warmNeutral = {
  50: '#f6f3eb',
  100: '#eee8dd',
  200: '#e2d9ca',
  300: '#cbbba1',
  400: '#99886e',
  500: '#76654d',
  600: '#62543f',
  700: '#4d4334',
  800: '#393328',
  900: '#28251f',
  950: '#1c1b17',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: forest,
        teal: forest,
        sand,
        slate: warmNeutral,
      }
    },
  },
  plugins: [],
}
