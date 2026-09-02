'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { before, describe, it } = require('node:test');

const { content } = require('../src/config.js');
const { renderIndexHtml } = require('../src/render.js');
const {
  build,
  renderHeadersFile,
  referencedFonts,
  BUILD_DIR,
} = require('../scripts/build-static.js');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

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
    assert.equal(html.match(/[A-Z][A-Z0-9_]*_PLACEHOLDER/g), null);
  });

  it('matches what the Express server renders, byte for byte', () => {
    const template = fs.readFileSync(
      path.join(PUBLIC_DIR, 'index.html'),
      'utf8'
    );
    assert.equal(readBuild('index.html'), renderIndexHtml(template, content));
  });

  it('generates config.json from config.js', () => {
    const clientConfig = JSON.parse(readBuild('config.json'));
    assert.equal(
      clientConfig.formspreeEndpoint,
      content.form.formspreeEndpoint
    );
    assert.equal(
      clientConfig.secondDayLocation.name,
      content.secondDayLocation.name
    );
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
  const headers = renderHeadersFile();

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
    const css = fs.readFileSync(path.join(BUILD_DIR, 'custom.css'), 'utf8');
    for (const [, url] of css.matchAll(/src:\s*url\('\.\/([^']+)'/g)) {
      assert.ok(
        fs.existsSync(path.join(BUILD_DIR, url)),
        `@font-face points at ${url}, which is not in the build`
      );
    }
  });
});

describe('_headers cache rules', () => {
  const headers = () => renderHeadersFile();

  it('marks the page guests actually request as no-cache', () => {
    // Cloudflare matches `_headers` on the request path, and a visitor asks
    // for `/`. Listing only `/index.html` left the root uncovered.
    assert.match(headers(), /^\/\n {2}Cache-Control: no-cache$/m);
  });

  it('still covers /index.html', () => {
    assert.match(headers(), /^\/index\.html\n {2}Cache-Control: no-cache$/m);
  });
});
