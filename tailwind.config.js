/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { geist: ['var(--font-geist)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
