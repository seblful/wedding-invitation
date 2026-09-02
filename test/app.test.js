'use strict';

const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');

const { createApp } = require('../src/app.js');
const { loadContent } = require('../src/config.js');
const { findLeftoverPlaceholders } = require('../src/render.js');

const content = loadContent();

/** @type {import('node:http').Server} */
let server;
/** @type {string} */
let origin;

before(async () => {
  const app = createApp({ requestLogging: false });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = /** @type {import('node:net').AddressInfo} */ (
    server.address()
  );
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/**
 * @param {string} pathname
 * @param {RequestInit} [init]
 */
function get(pathname, init) {
  return fetch(`${origin}${pathname}`, { redirect: 'manual', ...init });
}

describe('GET /', () => {
  it('serves fully rendered HTML', async () => {
    const response = await get('/');
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.deepEqual(findLeftoverPlaceholders(html), []);
    assert.ok(html.includes(content.openGraph.title));
  });

  it('sets a content security policy', async () => {
    const csp = (await get('/')).headers.get('content-security-policy');
    assert.ok(csp, 'CSP header is missing');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-src [^;]*yandex/);
    assert.match(csp, /form-action [^;]*formspree\.io/);
  });

  it('sets the usual hardening headers and hides the framework', async () => {
    const { headers } = await get('/');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-powered-by'), null);
  });

  it('sends every header the table does not mark edge-only', async () => {
    // Drift between the two adapters is the bug this asserts against. It used
    // to skip Permissions-Policy as well, because that value lived inside
    // staticSecurityHeaders() where the Express adapter could not see it — so
    // the edge sent it and the dev server never did.
    const { headers } = await get('/');
    const { securityHeaders } = require('../src/security.js');

    /** Directive order and inter-directive spacing carry no meaning. */
    const asDirectiveSet = (csp) =>
      new Set(
        csp
          .split(';')
          .map((directive) => directive.trim())
          .filter(Boolean)
      );

    const expected = securityHeaders(content).filter((row) => !row.edgeOnly);
    assert.ok(expected.length >= 5, 'the table went empty');

    for (const { name, value } of expected) {
      const actual = headers.get(name.toLowerCase());
      if (name === 'Content-Security-Policy') {
        assert.deepEqual(
          asDirectiveSet(actual ?? ''),
          asDirectiveSet(value),
          'CSP differs from the static build'
        );
        continue;
      }
      assert.equal(actual, value, `${name} differs from the static build`);
    }
  });

  it('sends the one edge-only header nowhere but the edge', async () => {
    const { headers } = await get('/');
    const { securityHeaders } = require('../src/security.js');

    for (const { name } of securityHeaders(content).filter((r) => r.edgeOnly)) {
      assert.equal(
        headers.get(name.toLowerCase()),
        null,
        `${name} is marked edge-only but the dev server sends it`
      );
    }
  });

  it('confines the RSVP origin in the CSP to the endpoint config names', async () => {
    // The origin used to be a second literal in src/security.js, so the
    // documented FORMSPREE_ENDPOINT override moved the form action and left
    // the policy pointing at the old host.
    const csp = (await get('/')).headers.get('content-security-policy') ?? '';
    const origin = new URL(content.form.formspreeEndpoint).origin;

    assert.match(csp, new RegExp(`form-action [^;]*${origin}`));
    assert.match(csp, new RegExp(`connect-src [^;]*${origin}`));
  });
});

describe('GET /index.html', () => {
  it('redirects to / instead of leaking the unrendered template', async () => {
    const response = await get('/index.html');
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/');
  });
});

describe('GET /config.json', () => {
  it('is gone — the venue maps read the rendered markup instead', async () => {
    // Three of the five keys it served had no reader at all; the two that did
    // now arrive as data attributes on the map containers.
    const response = await get('/config.json', {
      headers: { Accept: 'application/json' },
    });
    assert.equal(response.status, 404);
  });
});

describe('GET /health', () => {
  it('reports ok', async () => {
    const response = await get('/health');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  });
});

describe('static assets', () => {
  it('serves the client entry module', async () => {
    const response = await get('/js/main.js');
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type') ?? '',
      /javascript/,
      'browsers refuse a module served with the wrong MIME type'
    );
  });

  it('serves the stylesheet', async () => {
    const response = await get('/styles.css');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/css/);
  });
});

describe('cache lifetimes', () => {
  // The same drift guard as the security headers above: the dev server and
  // build/_headers must both render src/caching.js, not their own idea of a
  // lifetime. express.static used to revalidate fonts hourly while the edge
  // called them immutable for a year.
  const { cacheControlFor } = require('../src/caching.js');

  const paths = [
    '/',
    '/js/main.js',
    '/styles.css',
    '/robots.txt',
    '/fonts/InkVerse.otf',
    '/images/icon.png',
  ];

  for (const pathname of paths) {
    it(`sends the declared policy for ${pathname}`, async () => {
      const expected = cacheControlFor(pathname);
      assert.ok(expected, `nothing in CACHE_POLICY covers ${pathname}`);

      const response = await get(pathname);
      assert.equal(response.status, 200, `${pathname} is not served`);
      assert.equal(response.headers.get('cache-control'), expected);
    });
  }
});

describe('unknown routes', () => {
  it('returns the rendered page with a 404 for navigations', async () => {
    const response = await get('/no-such-page', {
      headers: { Accept: 'text/html' },
    });
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.deepEqual(findLeftoverPlaceholders(html), []);
  });

  it('returns JSON for non-HTML clients', async () => {
    const response = await get('/no-such-page', {
      headers: { Accept: 'application/json' },
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  });
});
