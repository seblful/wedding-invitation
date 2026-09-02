/**
 * Wedding content — the single source of truth for everything guest-facing.
 *
 * Edit this file to personalise the invitation; no HTML, CSS or JS changes are
 * needed. Both the Express server (`src/app.js`) and the static site generator
 * (`scripts/build-static.js`) render from this object via `src/render.js`, so
 * the two outputs can never drift apart.
 *
 * Every field here reaches the page, and a test fails on one that does not.
 * The venue names and addresses used to be validated on every boot and
 * rendered nowhere: the text a guest read lived in the markup instead, and
 * both addresses had already drifted from the copy here.
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

  /**
   * Ceremony start. Drives the client-side countdown.
   *
   * Written in UTC, so it needs no companion timezone: 15:00 Europe/Minsk is
   * the wall clock it was worked out from. A `timezone` field sat here for a
   * while, validated on every boot and read by nothing.
   */
  weddingDate: '2026-08-02T12:00:00.000Z',

  location: {
    name: 'River Hall – госцевы комплекс',
    /** One line per rendered line; src/render.js joins them with a break. */
    address: ['горад Гродна, вуліца Падольная, дом 23'],
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.833062,53.671368&z=16&pt=23.833062,53.671368,pm2rdm',
    yandexDirectUrl: 'https://yandex.com/maps/-/CPqGnRmu',
  },

  secondDayLocation: {
    name: 'Дом | Баня',
    address: [
      'горад Гродна, вуліца Прыгародная, д. 26,',
      'уваход з вуліцы Ціхай',
    ],
    yandexMapUrl:
      'https://yandex.ru/map-widget/v1/?ll=23.846794,53.667998&z=16&pt=23.846794,53.667998,pm2rdm',
  },

  form: {
    deadline: '30 чэрвеня 2026 года',
    /** Formspree receives the RSVP directly from the browser. */
    formspreeEndpoint: 'https://formspree.io/f/xykdrgnb',
  },
};
