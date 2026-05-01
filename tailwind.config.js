/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        'soft-blue': '#9CBDE1',
        'soft-orange': '#EE9452',
        'soft-yellow': '#F2E8A5',
        'soft-lavender': '#C8ADE0',
        'soft-green': '#A1D274',
        'soft-pink': '#DE87A7',
        burgundy: '#600D16',
        beige: '#E8D5B7',
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
        base: 'clamp(1rem, 2.5vw, 1.2rem)',
        md: 'clamp(1.1rem, 2.8vw, 1.35rem)',
        lg: 'clamp(1.3rem, 3vw, 1.563rem)',
        xl: 'clamp(1.6rem, 3.5vw, 1.953rem)',
        '2xl': 'clamp(1.8rem, 4vw, 2.441rem)',
        '3xl': 'clamp(2.2rem, 5vw, 3.052rem)',
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
      touchAction: {
        manipulation: 'manipulation',
      },
    },
  },
  plugins: [],
};
