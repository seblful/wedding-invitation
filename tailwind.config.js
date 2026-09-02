/**
 * Tailwind theme.
 *
 * Colour keys are the utility suffix: `primary` produces `text-primary`,
 * `bg-primary` and `border-primary`. The keys used to be spelled
 * `text-primary` / `text-secondary`, which generated `.text-text-primary` — so
 * every `text-primary` and `text-secondary` in the markup resolved to nothing.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Ink and supporting text.
        primary: '#333333',
        secondary: '#666666',

        // Surfaces.
        cream: '#fdf4e3',
        'section-bg': '#b9dfc6',

        // Accent palette, mirrored as custom properties in custom.css.
        'soft-blue': '#9cbde1',
        'soft-orange': '#ee9452',
        'soft-yellow': '#f2e8a5',
        'soft-lavender': '#c8ade0',
        'soft-green': '#a1d274',
        'soft-pink': '#de87a7',
        'soft-peach': '#f9dcc4',
        burgundy: '#600d16',
        beige: '#e8d5b7',
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
      boxShadow: {
        custom: '0 4px 15px rgba(0, 0, 0, 0.1)',
        'custom-hover': '0 6px 25px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
