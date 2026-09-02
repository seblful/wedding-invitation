/**
 * The colour palette — the single source of truth for every colour on the page.
 *
 * `tailwind.config.js` requires `colors` for `theme.extend.colors`, so a key
 * here **is** the utility suffix: `primary` produces `text-primary` and
 * `bg-primary`. `src/render.js` emits `customProperties` onto `:root`, and
 * `public/input.css` declares no colour of its own — it only reads them.
 *
 * These values used to be written out in three files, and had already come
 * apart. The body-text grey was corrected to #555 for contrast in
 * the stylesheet, but the Tailwind `secondary` that four component classes
 * actually `@apply` stayed at the #666 that fails AA against the green
 * sections — and only the Tailwind copy had a test following it.
 */

'use strict';

/**
 * Tailwind theme colours. A key is the utility suffix.
 *
 * Contrast is measured against `section-bg`, the green behind most sections,
 * not against white.
 *
 * @type {Record<string, string>}
 */
const colors = {
  // Ink and supporting text.
  primary: '#333333',
  // #666 measures 3.9:1 on the green, under the 4.5:1 WCAG AA asks for body
  // text. #555 clears it at 5.1:1.
  secondary: '#555555',

  // Surfaces.
  cream: '#fdf4e3',
  'section-bg': '#b9dfc6',

  // Accent palette.
  'soft-blue': '#9cbde1',
  // 2.1:1 on cream and 1.6:1 on the green: never for text or a focus ring.
  'soft-orange': '#ee9452',
  'soft-yellow': '#f2e8a5',
  'soft-lavender': '#c8ade0',
  'soft-green': '#a1d274',
  'soft-pink': '#de87a7',
  'soft-peach': '#f9dcc4',
  burgundy: '#600d16',
  beige: '#e8d5b7',
};

/**
 * The custom properties `public/input.css` reads, resolved to their values.
 *
 * `src/render.js` renders these into a `:root` block in the document head, so
 * the stylesheet needs no fallback copy of any of them. A property read but
 * not listed here is a broken colour; `test/styles.test.js` fails on one.
 */
const customProperties = Object.freeze({
  '--bg-primary': colors.cream,
  '--section-bg': colors['section-bg'],
  '--text-primary': colors.primary,
  '--text-secondary': colors.secondary,
  '--border-color': colors.primary,
  '--color-soft-orange': colors['soft-orange'],
  '--color-burgundy': colors.burgundy,
});

/** Browser UI colour (`<meta name="theme-color">`). */
const themeColor = colors.cream;

module.exports = {
  colors: Object.freeze(colors),
  customProperties,
  themeColor,
};
