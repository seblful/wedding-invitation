/**
 * Security headers, defined once.
 *
 * The Express server applies these through Helmet; the static build writes the
 * same policy into `build/_headers` so the Cloudflare deployment is not left
 * unprotected. Previously CSP was simply disabled (`contentSecurityPolicy:
 * false`) on the server and absent from the static output.
 */

'use strict';

/** Yandex serves the embedded venue maps. */
const YANDEX_ORIGINS = Object.freeze([
  'https://yandex.ru',
  'https://*.yandex.ru',
  'https://yandex.com',
  'https://*.yandex.com',
  'https://yandex.by',
  'https://*.yandex.by',
]);

/** Formspree receives the RSVP submission directly from the browser. */
const FORMSPREE_ORIGIN = 'https://formspree.io';

/**
 * @returns {Record<string, string[]>} Helmet-shaped CSP directives
 */
function contentSecurityPolicy() {
  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    scriptSrc: ["'self'"],
    // No inline event handlers anywhere in the markup, so block them outright.
    scriptSrcAttr: ["'none'"],
    // The theme block injected by src/render.js and the inline `style`
    // attributes used by the petal and flower animations.
    styleSrc: ["'self'", "'unsafe-inline'"],
    // `data:` covers the inline SVG checkmark in custom.css.
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", FORMSPREE_ORIGIN],
    frameSrc: YANDEX_ORIGINS,
    formAction: ["'self'", FORMSPREE_ORIGIN],
    upgradeInsecureRequests: [],
  };
}

/**
 * Converts camelCase Helmet directives into the kebab-case header syntax.
 *
 * @param {Record<string, string[]>} directives
 * @returns {string}
 */
function serializeCsp(directives) {
  return Object.entries(directives)
    .map(([name, values]) => {
      const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return values.length > 0 ? `${kebab} ${values.join(' ')}` : kebab;
    })
    .join('; ');
}

/**
 * Not `no-referrer`: the embedded Yandex maps are third-party frames, and
 * sending the origin (never the path) keeps them working while still leaking
 * nothing about which section a guest was reading.
 */
const REFERRER_POLICY = 'strict-origin-when-cross-origin';

/** Matches the CSP `frame-ancestors 'none'` above. */
const FRAME_OPTIONS = 'DENY';

/**
 * Headers for the static deployment, mirroring what Helmet sets on Express.
 *
 * @returns {Record<string, string>}
 */
function staticSecurityHeaders() {
  return {
    'Content-Security-Policy': serializeCsp(contentSecurityPolicy()),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': REFERRER_POLICY,
    'X-Frame-Options': FRAME_OPTIONS,
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

module.exports = {
  contentSecurityPolicy,
  serializeCsp,
  staticSecurityHeaders,
  REFERRER_POLICY,
  FRAME_OPTIONS,
  YANDEX_ORIGINS,
  FORMSPREE_ORIGIN,
};
