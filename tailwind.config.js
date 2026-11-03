/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Montserrat Variable"', 'Montserrat', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#070b07', 900: '#0a100a', 800: '#0e150e', 700: '#142014', 600: '#1d2c1d' },
        farm: { DEFAULT: '#6bc805', bright: '#82c63d', deep: '#06341c', mid: '#0b4a26', line: '#1f6b3a' },
        gold: { DEFAULT: '#d4af37', soft: '#e6c869', dim: '#8f7424' },
        mist: { DEFAULT: '#aebcae', dim: '#7d8d7d' },
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-5px)' }, '75%': { transform: 'translateX(5px)' } },
        sheen: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
      },
      animation: {
        rise: 'rise .6s cubic-bezier(.2,.7,.2,1) both',
        fade: 'fade .5s ease both',
        shake: 'shake .35s ease',
        sheen: 'sheen 2.8s ease-in-out 0.8s 1 both',
      },
    },
  },
  plugins: [],
}
