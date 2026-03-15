/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        'soft-blue': '#e4f7ff',
        'soft-peach': '#fcdcc0',
        'soft-yellow': '#fff9d2',
        'soft-lavender': '#eed0f5',
        'soft-green': '#d9fdd9',
        milky: '#fdfff5',
        cream: '#fdf4e3',
        'section-bg': '#b9dfc6',
        'text-primary': '#333',
        'text-secondary': '#666',
      },
      fontFamily: {
        inkverse: ['InkVerse', 'Georgia', 'Garamond', 'serif'],
        skolar: ['"Skolar PE"', 'serif'],
      },
      fontSize: {
        base: '1.2rem',
        md: '1.35rem',
        lg: '1.563rem',
        xl: '1.953rem',
        '2xl': '2.441rem',
        '3xl': '3.052rem',
      },
      spacing: {
        15: '60px',
        20: '80px',
      },
      screens: {
        375: '375px',
        428: '428px',
        768: '768px',
        1024: '1024px',
      },
      boxShadow: {
        custom: '0 4px 15px rgba(0, 0, 0, 0.1)',
        'custom-hover': '0 6px 25px rgba(0, 0, 0, 0.15)',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
