/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff0f0',
          100: '#ffd6d8',
          300: '#ff5560',
          400: '#ff2a35',
          500: '#e01020',
          600: '#b3000e',
          700: '#8f0009',
          900: '#3d0005',
        },
        // Grises neutros puros (sin tinte azul de Tailwind por defecto)
        gray: {
          700: '#3a3a3a',
          800: '#1f1f1f',
          850: '#161616',
          900: '#111111',
          950: '#080808',
        }
      }
    }
  },
  plugins: []
};
