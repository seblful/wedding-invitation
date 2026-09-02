/**
 * Security headers, defined once.
 *
 * One table, two adapters: `expressSecurity()` shapes it for Helmet on the dev
 * server, `staticSecurityHeaders()` shapes it for `build/_headers` at the edge.
 * The CSP used to be `false` on Express and absent from the static output
 * altogether.
 *
 * `securityHeaders()` is the table, and it is spelled in wire format — the
 * header names and values a browser actually receives — rather than in
 * Helmet's option shape. When `contentSecurityPolicy()` returned Helmet's
 * shape, one of the two adapters dictated the internal representation and the
 * other paid a converter for it; worse, `staticSecurityHeaders()` carried two
 * values of its own, so `Permissions-Policy` reached the edge and the dev
 * server could not send it at all. The parity test stepped over the gap.
 *
 * Nothing here is a value an adapter may add to or leave out on its own. A
 * header the dev server deliberately skips says so in the table, as
 * `edgeOnly`.
 */

'use strict';

/** Yandex serves the map widget from several regional hostnames. */
const YANDEX_ORIGINS = Object.freeze([
  'https://yandex.ru',
  'https://*.yandex.ru',
  'https://yandex.com',
  'https://*.yandex.com',
  'https://yandex.by',
  'https://*.yandex.by',
]);

/**
 * The origin the RSVP form posts to, taken from the endpoint it posts to.
 *
 * Spelled as a literal here once, which meant the documented
 * `FORMSPREE_ENDPOINT` override moved the `<form action>` and left the policy
 * behind: the form then posted to a host `form-action` forbade and failed
 * silently in the browser console.
 *
 * @param {string} endpoint
 * @returns {string}
 */
function formEndpointOrigin(endpoint) {
  return new URL(endpoint).origin;
}

/**
 * CSP directives in wire syntax — kebab-case names, as the header spells them.
 *
 * @param {import('./config.js').SiteContent} content
 * @returns {Record<string, string[]>}
 */
function cspDirectives(content) {
  const formOrigin = formEndpointOrigin(content.form.formspreeEndpoint);

  return {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'script-src': ["'self'"],
    // No inline event handlers anywhere in the markup, so block them outright.
    'script-src-attr': ["'none'"],
    // The theme block injected by src/render.js and the inline `style`
    // attributes used by the petal and flower animations.
    'style-src': ["'self'", "'unsafe-inline'"],
    // `data:` covers the inline SVG checkmark in the stylesheet.
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    // The form endpoint only: nothing fetches from our own origin now that the
    // venue maps read their URL off the rendered markup.
    'connect-src': [formOrigin],
    'frame-src': YANDEX_ORIGINS,
    'form-action': ["'self'", formOrigin],
    'upgrade-insecure-requests': [],
  };
}

/**
 * @param {Record<string, string[]>} directives
 * @returns {string} the `Content-Security-Policy` header value
 */
function serializeCsp(directives) {
  return Object.entries(directives)
    .map(([name, values]) =>
      values.length > 0 ? `${name} ${values.join(' ')}` : name
    )
    .join('; ');
}

/**
 * Every security header the site sends, as it appears on the wire.
 *
 * `edgeOnly` marks a header only the production deployment sends. HSTS is the
 * one such header: local development is served over plain HTTP, where
 * committing the browser to HTTPS for a year would be a trap.
 *
 * @param {import('./config.js').SiteContent} content
 * @returns {Array<{ name: string, value: string, edgeOnly: boolean }>}
 */
function securityHeaders(content) {
  return [
    {
      name: 'Content-Security-Policy',
      value: serializeCsp(cspDirectives(content)),
      edgeOnly: false,
    },
    {
      name: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
      edgeOnly: true,
    },
    { name: 'X-Content-Type-Options', value: 'nosniff', edgeOnly: false },
    {
      name: 'Referrer-Policy',
      // Not `no-referrer`: the embedded Yandex maps are third-party frames, and
      // sending the origin (never the path) keeps them working while still
      // leaking nothing about which section a guest was reading.
      value: 'strict-origin-when-cross-origin',
      edgeOnly: false,
    },
    // Matches the CSP `frame-ancestors 'none'` above.
    { name: 'X-Frame-Options', value: 'DENY', edgeOnly: false },
    {
      name: 'Permissions-Policy',
      value: 'geolocation=(), microphone=(), camera=()',
      edgeOnly: false,
    },
  ];
}

/**
 * The table, shaped for the Express server.
 *
 * Helmet owns the CSP — it wants structured directives rather than a header
 * value — and nothing else the table declares. Every other row is applied
 * verbatim from `headers`, so a value on the wire is the table's value and
 * Helmet's option names never reach `src/app.js`. That is also what closes the
 * `Permissions-Policy` gap: Helmet has no option for it, which is why the
 * header used to reach the edge and never the dev server.
 *
 * @param {import('./config.js').SiteContent} content
 * @returns {{ helmet: object, headers: Record<string, string> }}
 */
function expressSecurity(content) {
  const headers = Object.fromEntries(
    securityHeaders(content)
      .filter((row) => !row.edgeOnly && row.name !== 'Content-Security-Policy')
      .map(({ name, value }) => [name, value])
  );

  return {
    helmet: {
      contentSecurityPolicy: { directives: cspDirectives(content) },
      // Declared `edgeOnly` in the table: local dev is plain HTTP, where
      // committing the browser to HTTPS for a year would be a trap.
      strictTransportSecurity: false,
      // Would block the Yandex map iframes, which send no CORP header.
      crossOriginEmbedderPolicy: false,
      // The table sets these three itself, so Helmet must not also have an
      // opinion about them — its defaults disagree with ours on two.
      referrerPolicy: false,
      frameguard: false,
      noSniff: false,
    },
    headers,
  };
}

/**
 * The table, shaped for `build/_headers`. The edge sends every row.
 *
 * @param {import('./config.js').SiteContent} content
 * @returns {Record<string, string>}
 */
function staticSecurityHeaders(content) {
  return Object.fromEntries(
    securityHeaders(content).map(({ name, value }) => [name, value])
  );
}

module.exports = {
  securityHeaders,
  expressSecurity,
  staticSecurityHeaders,
};
