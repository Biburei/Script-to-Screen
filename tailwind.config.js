/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        horror: {
          950: '#090a0f',
          900: '#0f111a',
          800: '#181b28',
          700: '#262a3d',
          accent: '#e63946',
          amber: '#ffb703',
          cyan: '#00f0ff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
        display: ['Cinzel', 'Playfair Display', 'serif']
      }
    },
  },
  plugins: [],
}
