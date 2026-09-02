'use strict';

const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');

const { createApp } = require('../src/app.js');
const { content } = require('../src/config.js');

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
    assert.equal(html.match(/[A-Z][A-Z0-9_]*_PLACEHOLDER/g), null);
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

  it('sends the same hardening headers the static build writes to _headers', async () => {
    // Drift between the two is the bug this asserts against: the edge and the
    // dev server must agree on everything except HSTS.
    const { headers } = await get('/');
    const { staticSecurityHeaders } = require('../src/security.js');

    /** Directive order and inter-directive spacing carry no meaning. */
    const asDirectiveSet = (csp) =>
      new Set(
        csp
          .split(';')
          .map((directive) => directive.trim())
          .filter(Boolean)
      );

    for (const [name, value] of Object.entries(staticSecurityHeaders())) {
      if (name === 'Strict-Transport-Security') continue;
      if (name === 'Permissions-Policy') continue; // Helmet does not set it.

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
});

describe('GET /index.html', () => {
  it('redirects to / instead of leaking the unrendered template', async () => {
    const response = await get('/index.html');
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/');
  });
});

describe('GET /config.json', () => {
  it('returns the generated client config', async () => {
    const response = await get('/config.json');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/
    );
    assert.equal(body.formspreeEndpoint, content.form.formspreeEndpoint);
    assert.equal(Date.parse(body.weddingDate), Date.parse(content.weddingDate));
  });

  it('matches what the markup looks up by data-venue', async () => {
    const body = await get('/config.json').then((r) => r.json());
    const html = await get('/').then((r) => r.text());

    for (const match of html.matchAll(/data-venue="([^"]+)"/g)) {
      assert.ok(body[match[1]], `config.json has no "${match[1]}" venue`);
    }
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
    const response = await get('/custom.css');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/css/);
  });
});

describe('unknown routes', () => {
  it('returns the rendered page with a 404 for navigations', async () => {
    const response = await get('/no-such-page', {
      headers: { Accept: 'text/html' },
    });
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.equal(html.match(/[A-Z][A-Z0-9_]*_PLACEHOLDER/g), null);
  });

  it('returns JSON for non-HTML clients', async () => {
    const response = await get('/no-such-page', {
      headers: { Accept: 'application/json' },
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  });
});
