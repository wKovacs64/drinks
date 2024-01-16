/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: '#6d372a', // closest: yellow-900
        'burnt-orange': '#d09e45', // closest: orange-400
        cream: '#eedebf', // closest: orange-200
      },
      fontFamily: {
        // Note: must be double-quoted strings if there's a number in the name
        sans: ['"Source Sans 3"', '"Source Sans 3 Fallback"'],
      },
      transitionTimingFunction: {
        default: 'ease',
      },
    },
  },
  plugins: [],
};
