/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          black:    '#0A0A0A',
          red:      '#CC0000',
          redDark:  '#8B0000',
          surface:  '#1C1C1C',
          card:     '#141414',
          border:   '#2E2E2E',
          primary:  '#E8E8E8',
          secondary:'#AAAAAA',
          muted:    '#666666',
          success:  '#2ECC71',
          danger:   '#E53935',
        },
      },
      fontFamily: {
        barlow: ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

