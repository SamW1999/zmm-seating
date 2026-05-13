import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: '#E5DFD1',
        grid: '#EAE4D8',
        table: '#F7F3EB',
        tableBorder: '#C8C0A8',
        seatAvail: '#3A8F3D',
        seatAvailBorder: '#276429',
        seatTaken: '#DDD8CC',
        seatTakenBorder: '#C2BBAC',
      },
      fontFamily: {
        garamond: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
