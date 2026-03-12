/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/**/*.js'],
  theme: {
    extend: {
      colors: {
        'Светла-блакітный': '#e4f7ff',
        'Светла-персікавы': '#fcdcc0',
        'Бледна-жоўты': '#fff9d2',
        'Светла-бэзавы': '#eed0f5',
        'Бледна-зялёны': '#d9fdd9',
        'Малочна-белый': '#fdfff5',
        Крэмавы: '#fdf4e3',
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
      keyframes: {
        bounce: {
          '0%, 20%, 50%, 80%, 100%': {
            transform: 'translateX(-50%) translateY(0)',
          },
          '40%': {
            transform: 'translateX(-50%) translateY(-10px)',
          },
          '60%': {
            transform: 'translateX(-50%) translateY(-5px)',
          },
        },
        fall: {
          '0%': {
            transform: 'translateY(-50px) rotate(0deg) translateX(0)',
            opacity: '0',
          },
          '5%': {
            opacity: '0.8',
          },
          '95%': {
            opacity: '0.8',
          },
          '100%': {
            transform:
              'translateY(var(--fall-distance, 100vh)) rotate(360deg) translateX(100px)',
            opacity: '0',
          },
        },
      },
      animation: {
        bounce: 'bounce 2s infinite',
        fall: 'fall linear forwards',
      },
      boxShadow: {
        custom: '0 4px 15px rgba(0, 0, 0, 0.1)',
        'custom-hover': '0 6px 25px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
