'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { before, describe, it } = require('node:test');

const { cacheControlFor, sitePathFor } = require('../src/caching.js');
const { loadContent } = require('../src/config.js');
const { PUBLIC_DIR, BUILD_DIR } = require('../src/paths.js');

const content = loadContent();
const {
  renderIndexHtml,
  findLeftoverPlaceholders,
} = require('../src/render.js');
const {
  build,
  renderHeadersFile,
  referencedFonts,
} = require('../scripts/build-static.js');

before(() => {
  build();
});

/** @param {string} relative */
function readBuild(relative) {
  return fs.readFileSync(path.join(BUILD_DIR, relative), 'utf8');
}

describe('build output', () => {
  it('renders index.html with no placeholders left', () => {
    const html = readBuild('index.html');
    assert.deepEqual(findLeftoverPlaceholders(html), []);
  });

  it('matches what the Express server renders, byte for byte', () => {
    const template = fs.readFileSync(
      path.join(PUBLIC_DIR, 'index.html'),
      'utf8'
    );
    assert.equal(readBuild('index.html'), renderIndexHtml(template, content));
  });

  it('ships no config.json', () => {
    // It carried five keys, three of them unread; the venue maps take their
    // URL off the rendered markup now.
    assert.equal(fs.existsSync(path.join(BUILD_DIR, 'config.json')), false);
  });

  it('ships the client modules', () => {
    for (const file of ['js/main.js', 'js/rsvp-form.js', 'js/countdown.js']) {
      assert.ok(
        fs.existsSync(path.join(BUILD_DIR, file)),
        `${file} is missing from the build`
      );
    }
  });

  it('leaves the Tailwind source file out of the deployable tree', () => {
    assert.equal(fs.existsSync(path.join(BUILD_DIR, 'input.css')), false);
  });

  it('is reproducible across consecutive runs', () => {
    const first = readBuild('index.html');
    build();
    assert.equal(readBuild('index.html'), first);
  });
});

describe('_headers', () => {
  const headers = renderHeadersFile(content);

  it('applies a policy to every path', () => {
    assert.ok(headers.startsWith('/*\n'));
  });

  it('carries the same CSP the server sends', () => {
    assert.match(headers, /Content-Security-Policy: default-src 'self'/);
    assert.match(headers, /frame-src [^\n]*yandex/);
  });

  it('enables HSTS, which the local dev server deliberately does not', () => {
    assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
  });

  it('is written into the build', () => {
    assert.equal(readBuild('_headers'), headers);
  });
});

describe('cache lifetimes', () => {
  /** Every file in the build, as the site path a visitor would request. */
  const shipped = () =>
    fs
      .readdirSync(BUILD_DIR, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => fs.statSync(path.join(BUILD_DIR, entry)).isFile())
      .map((entry) => sitePathFor(entry, BUILD_DIR))
      // Cloudflare reads this one rather than serving it.
      .filter((sitePath) => sitePath !== '/_headers');

  it('declares a lifetime for every file it ships', () => {
    // A new kind of asset with no rule would inherit whatever the CDN felt
    // like, which is how scripts, styles and images ended up with no declared
    // policy in production at all.
    const uncovered = shipped()
      .filter((sitePath) => cacheControlFor(sitePath) === null)
      .sort();

    assert.deepEqual(
      uncovered,
      [],
      `nothing in src/caching.js covers these:\n  ${uncovered.join('\n  ')}`
    );
  });

  it('holds only the fonts immutable', () => {
    // Everything else is unhashed: an edit has to reach a returning guest.
    const immutable = shipped()
      .filter((sitePath) => cacheControlFor(sitePath)?.includes('immutable'))
      .filter((sitePath) => !sitePath.startsWith('/fonts/'));

    assert.deepEqual(immutable, []);
  });
});

describe('font shipping', () => {
  it('ships every font the stylesheet and markup reference', () => {
    const shipped = new Set(fs.readdirSync(path.join(BUILD_DIR, 'fonts')));
    const missing = [...referencedFonts()].filter((f) => !shipped.has(f));

    assert.deepEqual(
      missing,
      [],
      `these fonts are referenced but were left out of the build: ${missing.join(', ')}`
    );
  });

  it('ships no font nothing references', () => {
    const referenced = referencedFonts();
    const orphans = fs
      .readdirSync(path.join(BUILD_DIR, 'fonts'))
      .filter((f) => !referenced.has(f));

    assert.deepEqual(
      orphans,
      [],
      `dead weight on the CDN: ${orphans.join(', ')}`
    );
  });

  it('resolves every @font-face src to a file that exists', () => {
    // One stylesheet now: public/custom.css was a second sheet loaded after
    // the whole Tailwind output, and it shipped unminified and unprefixed
    // because it never entered the PostCSS pipeline.
    const css = fs.readFileSync(path.join(BUILD_DIR, 'styles.css'), 'utf8');
    for (const [, url] of css.matchAll(
      /url\(\.?\/?([\w %.-]+\.(?:otf|ttf|woff2?))\)/g
    )) {
      assert.ok(
        fs.existsSync(path.join(BUILD_DIR, url)),
        `@font-face points at ${url}, which is not in the build`
      );
    }
  });
});

describe('_headers cache rules', () => {
  const headers = () => renderHeadersFile(content);

  it('marks the page guests actually request as no-cache', () => {
    // Cloudflare matches `_headers` on the request path, and a visitor asks
    // for `/`. Listing only `/index.html` left the root uncovered.
    assert.match(headers(), /^\/\n {2}Cache-Control: no-cache$/m);
  });

  it('still covers /index.html', () => {
    assert.match(headers(), /^\/index\.html\n {2}Cache-Control: no-cache$/m);
  });
});
