const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: '#6d372a', // closest: yellow-900
        'burnt-orange': '#d09e45', // closest: orange-400
        cream: '#eedebf', // closest: orange-200
      },
      fontFamily: {
        sans: ['Source Sans Pro', ...defaultTheme.fontFamily.sans],
      },
      transitionTimingFunction: {
        default: 'ease',
      },
    },
  },
  plugins: [],
};
