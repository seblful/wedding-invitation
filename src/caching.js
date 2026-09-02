/**
 * Cache lifetimes, defined once.
 *
 * The Express server applies these through `express.static`; the static build
 * writes the same policy into `build/_headers` so the Cloudflare deployment
 * agrees with it. This is the same shape `src/security.js` has, for the same
 * reason: the two used to declare their own lifetimes and had drifted.
 *
 * `express.static` revalidated fonts every hour while `_headers` called them
 * immutable for a year, and scripts, styles and images had a one-hour lifetime
 * in development and no declared policy at all in production. The page itself
 * was covered by neither — `/` is served by a route rather than from disk, so
 * the `.html` rule never fired.
 */

'use strict';

/** Fresh for a year and never revalidated. Only safe for immutable bytes. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Held, but revalidated against the ETag once the hour is up. */
const SHORT = 'public, max-age=3600';

/** Never served from cache without asking first. */
const REVALIDATE = 'no-cache';

/**
 * Site paths and their Cache-Control, in Cloudflare `_headers` pattern syntax:
 * an exact path, or a prefix ending in `/*`.
 *
 * Every file the build ships has to match one of these — `test/build-static`
 * fails on a path nothing covers, which is what keeps the list honest when a
 * new kind of asset shows up.
 */
const CACHE_POLICY = Object.freeze([
  Object.freeze({
    // The markup changes on every content edit and its URL never does. Both
    // spellings: Cloudflare matches on the request path, and a visitor asks
    // for `/`, never for `/index.html`.
    paths: Object.freeze(['/', '/index.html']),
    cacheControl: REVALIDATE,
  }),
  Object.freeze({
    // Font filenames are stable and their bytes never change in place; adding
    // a font means adding a filename, so a year is safe.
    paths: Object.freeze(['/fonts/*']),
    cacheControl: IMMUTABLE,
  }),
  Object.freeze({
    // Everything else is unhashed, so it cannot be held hard: an edit to the
    // stylesheet or a client module has to reach a guest who has been here
    // before. An hour, then revalidate.
    paths: Object.freeze([
      '/js/*',
      '/images/*',
      '/styles.css',
      '/custom.css',
      '/robots.txt',
    ]),
    cacheControl: SHORT,
  }),
]);

/**
 * @param {string} pattern an exact site path, or a prefix ending in `/*`
 * @param {string} pathname a site path, always leading-slashed
 * @returns {boolean}
 */
function pathMatches(pattern, pathname) {
  return pattern.endsWith('/*')
    ? pathname.startsWith(pattern.slice(0, -1))
    : pattern === pathname;
}

/**
 * The Cache-Control for a site path, or `null` when nothing covers it.
 *
 * @param {string} pathname
 * @returns {string | null}
 */
function cacheControlFor(pathname) {
  for (const { paths, cacheControl } of CACHE_POLICY) {
    if (paths.some((pattern) => pathMatches(pattern, pathname))) {
      return cacheControl;
    }
  }
  return null;
}

/**
 * The policy as `_headers` blocks: a path pattern, then indented header lines.
 *
 * @returns {Array<{ path: string, headers: Record<string, string> }>}
 */
function cacheHeaderBlocks() {
  return CACHE_POLICY.flatMap(({ paths, cacheControl }) =>
    paths.map((path) => ({
      path,
      headers: { 'Cache-Control': cacheControl },
    }))
  );
}

module.exports = {
  cacheControlFor,
  cacheHeaderBlocks,
  CACHE_POLICY,
};
