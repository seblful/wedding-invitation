/**
 * Wedding content — the single source of truth for everything guest-facing.
 *
 * Edit this file to personalise the invitation; no HTML, CSS or JS changes are
 * needed. Both the Express server (`src/app.js`) and the static site generator
 * (`scripts/build-static.js`) render from this object via `src/render.js`, so
 * the two outputs can never drift apart.
 *
 * Values are validated on load by `src/config.js` — a typo fails fast at boot
 * rather than silently producing a broken page.
 *
 * Colours are not here: they live in `palette.js`, which `tailwind.config.js`
 * and `src/render.js` both read.
 */

'use strict';

/** @type {import('./src/config.js').SiteContent} */
module.exports = {
  /** Canonical public origin. Used for absolute Open Graph URLs. */
  baseUrl: 'https://вяселле.бел',

  openGraph: {
    title: "Вяселле Аляксея і Дар'і",
    description:
      'Запрашаем вас падзяліць з намі наш асаблівы дзень! 2 жніўня 2026 года будзем рады бачыць вас на нашым вяселлі ў River Hall, Гродна.',
    /** Relative to the site root; resolved against `baseUrl` when rendered. */
    image: 'images/preview.png',
  },

  /** Ceremony start, in UTC. Drives the client-side countdown. */
  weddingDate: '2026-08-02T12:00:00.000Z',
  /** The wall-clock zone `weddingDate` was worked out in. Not rendered. */
  timezone: 'Europe/Minsk',

  location: {
    name: 'River Hall',
    address: 'вул. Падольная, д. 23, г. Гродна',
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.833062,53.671368&z=16&pt=23.833062,53.671368,pm2rdm',
    yandexDirectUrl: 'https://yandex.com/maps/-/CPqGnRmu',
  },

  secondDayLocation: {
    name: 'Дом | Баня',
    address: 'вул. Прыгародная, д. 26, г. Гродна',
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.846794,53.667998&z=16&pt=23.846794,53.667998,pm2rdm',
  },

  form: {
    deadline: '30 чэрвеня 2026 года',
    /** Formspree receives the RSVP directly from the browser. */
    formspreeEndpoint: 'https://formspree.io/f/xykdrgnb',
  },
};
