'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { describe, it } = require('node:test');

const palette = require('../palette.js');
const { loadContent } = require('../src/config.js');
const { INDEX_TEMPLATE } = require('../src/paths.js');
const {
  renderIndexHtml,
  findLeftoverPlaceholders,
  TemplateError,
} = require('../src/render.js');

const content = loadContent();

const TEMPLATE = fs.readFileSync(INDEX_TEMPLATE, 'utf8');

/**
 * The five characters `src/render.js` escapes. Spelled here rather than
 * imported: `escapeHtml` was one of six internals promoted to the module's
 * exports so this file could reach them, and every assertion below now goes
 * through `renderIndexHtml` instead — the interface callers actually use.
 *
 * @param {unknown} value
 * @returns {string}
 */
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );

/**
 * @param {Record<string, unknown>} overrides
 * @returns {string} the page rendered from content with `overrides` applied
 */
const renderWith = (overrides) =>
  renderIndexHtml(TEMPLATE, { ...structuredClone(content), ...overrides });

describe('escaping, through the rendered page', () => {
  it("escapes the apostrophe in names such as Дар'і", () => {
    const html = renderWith({
      openGraph: { ...content.openGraph, title: "Вяселле Дар'і" },
    });
    assert.ok(html.includes('<title>Вяселле Дар&#39;і</title>'));
  });

  it('leaves Cyrillic text alone', () => {
    assert.ok(renderIndexHtml(TEMPLATE, content).includes('Вяселле'));
  });

  it('escapes a quote rather than breaking out of the attribute', () => {
    const html = renderWith({
      openGraph: { ...content.openGraph, title: 'He said "hi"' },
    });
    assert.ok(html.includes('content="He said &quot;hi&quot;"'));
    assert.ok(!html.includes('content="He said "hi""'));
  });

  it('escapes a tag rather than injecting one', () => {
    const html = renderWith({
      form: { ...content.form, deadline: '<script>alert(1)</script>' },
    });
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  });
});

describe('absolute URLs, through the rendered page', () => {
  it('resolves the Open Graph image against the base URL', () => {
    const html = renderWith({ baseUrl: 'https://example.test' });
    assert.ok(
      html.includes(
        'property="og:image" content="https://example.test/images/preview.png"'
      )
    );
  });

  it('tolerates a trailing slash on the base URL', () => {
    const html = renderWith({ baseUrl: 'https://example.test///' });
    assert.ok(
      html.includes(
        'property="og:image" content="https://example.test/images/preview.png"'
      ),
      'a trailing slash produced a doubled separator'
    );
    assert.ok(html.includes('content="https://example.test/"'));
  });
});

describe('the social card, through the rendered page', () => {
  const html = renderIndexHtml(TEMPLATE, content);

  it('emits both Open Graph and Twitter cards', () => {
    for (const property of [
      'og:title',
      'og:description',
      'og:image',
      'og:image:alt',
      'og:url',
      'og:type',
      'og:locale',
    ]) {
      assert.ok(html.includes(`property="${property}"`), `missing ${property}`);
    }
    for (const name of [
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      assert.ok(html.includes(`name="${name}"`), `missing ${name}`);
    }
  });

  it('makes the Open Graph image absolute', () => {
    assert.match(
      html,
      /property="og:image" content="https:\/\/[^"]+preview\.png"/
    );
  });
});

describe('renderIndexHtml', () => {
  const html = renderIndexHtml(TEMPLATE, content);

  it('leaves no placeholder behind in the real template', () => {
    assert.deepEqual(findLeftoverPlaceholders(html), []);
  });

  it('renders every value config.js declares', () => {
    // The other half of the placeholder guard. renderIndexHtml already throws
    // when a replacement has no slot and when a token survives substitution,
    // but neither catches a *config field* nothing renders — which is how the
    // venue names and both addresses came to be validated on every boot and
    // read by nobody, while the text a guest saw sat in the markup and drifted.
    /** @param {unknown} node @param {string} at @returns {Array<[string, string]>} */
    const leaves = (node, at = '') => {
      if (typeof node === 'string') return [[at, node]];
      if (Array.isArray(node)) {
        return node.flatMap((item, i) => leaves(item, `${at}[${i}]`));
      }
      if (node && typeof node === 'object') {
        return Object.entries(node).flatMap(([key, value]) =>
          leaves(value, at ? `${at}.${key}` : key)
        );
      }
      return [];
    };

    const missing = leaves(content)
      .filter(([, value]) => !html.includes(escapeHtml(value)))
      .map(([at, value]) => `${at} = ${JSON.stringify(value)}`);

    assert.deepEqual(
      missing,
      [],
      `config.js declares these but nothing renders them:\n  ${missing.join('\n  ')}`
    );
  });

  it('renders each venue name and address from the config', () => {
    for (const venue of [content.location, content.secondDayLocation]) {
      assert.ok(
        html.includes(escapeHtml(venue.name)),
        `${venue.name} is not on the page`
      );
      assert.ok(
        html.includes(venue.address.map(escapeHtml).join('<br />')),
        `${venue.name}'s address is not rendered as one block`
      );
    }
  });

  it('substitutes the page title', () => {
    assert.ok(
      html.includes(`<title>${escapeHtml(content.openGraph.title)}</title>`)
    );
  });

  it('points the form straight at Formspree', () => {
    assert.ok(
      html.includes(`action="${content.form.formspreeEndpoint}"`),
      'the form action should be the Formspree endpoint in every build'
    );
    assert.ok(
      !html.includes('/api/submit-form'),
      'the removed Express proxy should not appear anywhere'
    );
  });

  it('renders the wedding date into the countdown container', () => {
    assert.ok(
      html.includes(
        `data-wedding-date="${new Date(content.weddingDate).toISOString()}"`
      )
    );
  });

  it('injects every palette custom property', () => {
    // input.css declares none of these itself, so a property missing here is
    // a colour that never reaches the page.
    for (const [property, value] of Object.entries(palette.customProperties)) {
      assert.ok(
        html.includes(`${property}: ${value};`),
        `${property} was not rendered into the :root block`
      );
    }
  });

  it('writes palette values into the style block unescaped', () => {
    // HTML entities do not decode inside <style>, so escaping a value here
    // would corrupt it. The render checks the value instead.
    const themeBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
    assert.ok(themeBlock.includes('--bg-primary'), 'no theme block rendered');
    assert.ok(!themeBlock.includes('&'), `escaped value in ${themeBlock}`);
  });

  it('refuses a palette value that is not a hex colour', () => {
    // A `url(...)` or a stray `}` in this position would close the rule and
    // let the rest of the value become CSS of its own. Escaping cannot help
    // inside <style>, so the render fails instead. The palette is a parameter
    // rather than something render.js reaches for, which is what puts this
    // path behind the one export instead of behind a promoted internal.
    for (const bad of ['red; } body { display: none', 'url(x)', '']) {
      assert.throws(
        () =>
          renderIndexHtml(TEMPLATE, content, {
            customProperties: { '--bg-primary': bad },
            themeColor: '#fdf4e3',
          }),
        (error) => {
          assert.ok(error instanceof TemplateError);
          assert.match(error.message, /not a hex colour/);
          return true;
        },
        `accepted ${JSON.stringify(bad)}`
      );
    }
  });

  it('accepts a three-digit hex', () => {
    const html = renderIndexHtml(TEMPLATE, content, {
      customProperties: { '--bg-primary': '#abc' },
      themeColor: '#abc',
    });
    assert.match(html, /--bg-primary: #abc;/);
  });

  it('sets the browser theme colour from the palette', () => {
    assert.ok(
      html.includes(`content="${palette.themeColor}"`),
      'theme-color meta does not carry the palette value'
    );
  });

  it('throws when the template has no slot for a replacement', () => {
    assert.throws(
      () => renderIndexHtml('<html></html>', content),
      (error) => {
        assert.ok(error instanceof TemplateError);
        assert.match(error.message, /no slot for/);
        return true;
      }
    );
  });

  it('throws when an unknown placeholder survives substitution', () => {
    const template = `${TEMPLATE}<p>SOMETHING_ELSE_PLACEHOLDER</p>`;
    assert.throws(
      () => renderIndexHtml(template, content),
      /Unsubstituted placeholder/
    );
  });

  it('is deterministic', () => {
    assert.equal(renderIndexHtml(TEMPLATE, content), html);
  });
});

describe('the venue map containers', () => {
  const html = renderIndexHtml(TEMPLATE, content);

  /** Every `<div class="map-container" ...>` opening tag, rendered. */
  const containers = [
    ...html.matchAll(/<div\s[^>]*class="map-container"[^>]*>/g),
  ].map((match) => match[0]);

  it('finds both maps', () => {
    assert.equal(containers.length, 2, 'expected two map containers');
  });

  it('renders each embed URL onto its own container', () => {
    // js/venue-maps.js builds the iframe from this attribute, so the frames go
    // up on first paint rather than after a /config.json round-trip.
    //
    // The `&` separators arrive escaped, which is what an HTML attribute
    // needs; the DOM hands `dataset.mapEmbed` back decoded.
    const embedded = containers.map(
      (tag) => /data-map-embed="([^"]*)"/.exec(tag)?.[1]
    );

    assert.deepEqual(embedded, [
      escapeHtml(content.location.yandexMapUrl),
      escapeHtml(content.secondDayLocation.yandexMapUrl),
    ]);
    for (const url of embedded) {
      assert.ok(!/&(?!amp;)/.test(url ?? ''), `unescaped & in ${url}`);
    }
  });

  it('gives every map container intrinsic dimensions', () => {
    // Same reason the images carry width/height: the browser cannot reserve
    // the space before the frame loads without them.
    for (const tag of containers) {
      assert.match(tag, /data-map-width="\d+"/, tag);
      assert.match(tag, /data-map-height="\d+"/, tag);
    }
  });

  it('names every map container for assistive technology', () => {
    for (const tag of containers) {
      assert.match(tag, /data-map-title="[^"]+"/, tag);
    }
  });

  it('keeps a noscript link behind every embed', () => {
    // The only fallback left: js/venue-maps.js no longer renders one, because
    // there is no fetch left to fail.
    assert.equal(
      (html.match(/class="map-fallback"/g) ?? []).length,
      containers.length
    );
  });
});

describe('the template itself', () => {
  it('is in step with render.js in both directions', () => {
    // This used to iterate buildReplacements(content) and check each token
    // appears in the template. renderIndexHtml enforces both halves itself —
    // a replacement with no slot and a token with no replacement each throw —
    // so rendering the real template without throwing *is* the assertion, and
    // the two cases have their own tests above.
    assert.doesNotThrow(() => renderIndexHtml(TEMPLATE, content));
  });

  it('loads the client entry point as a module', () => {
    assert.ok(TEMPLATE.includes('<script type="module" src="js/main.js">'));
  });
});

describe('the RSVP form markup', () => {
  it('is novalidate so the custom Belarusian errors can actually show', () => {
    // Native constraint validation aborts submission before the submit
    // handler runs, which would make js/rsvp-form.js unreachable.
    assert.match(TEMPLATE, /<form[^>]*id="guestSurveyForm"[^>]*novalidate/s);
  });

  it('keeps `required` for assistive technology', () => {
    assert.ok(TEMPLATE.includes('id="guestName"'));
    assert.match(TEMPLATE, /id="guestName"[\s\S]{0,400}?required/);
  });

  it('points every field at an error message that exists', () => {
    // js/rsvp-form.js finds a field's error span through this attribute, so
    // the a11y wiring and the error display are now the same declaration.
    const described = [...TEMPLATE.matchAll(/aria-describedby="([^"]+)"/g)].map(
      (match) => match[1]
    );

    assert.ok(described.length > 0, 'no aria-describedby in the form');
    for (const id of described) {
      assert.ok(
        TEMPLATE.includes(`id="${id}"`),
        `aria-describedby="${id}" points at nothing`
      );
    }
  });

  it('has a field pointing at every error message', () => {
    // An error span nothing describes can never be shown.
    const orphans = [...TEMPLATE.matchAll(/id="(error-[^"]+)"/g)]
      .map((match) => match[1])
      .filter((id) => !TEMPLATE.includes(`aria-describedby="${id}"`));

    assert.deepEqual(
      orphans,
      [],
      `no field points at these error messages: ${orphans.join(', ')}`
    );
  });

  it('marks every error message as an alert', () => {
    const errors = TEMPLATE.match(/class="form-error[^"]*"[^>]*/g) ?? [];
    assert.ok(errors.length > 0);
    for (const error of errors) {
      assert.match(error, /role="alert"/);
    }
  });
});

describe('images', () => {
  const tags = TEMPLATE.match(/<img[^>]*>/g) ?? [];

  it('finds images to check', () => {
    assert.ok(tags.length > 0);
  });

  it('gives every image intrinsic dimensions', () => {
    // Without width/height the browser cannot reserve space before the file
    // arrives, and the whole page reflows as each one lands.
    const missing = tags
      .filter((tag) => !tag.includes('width=') || !tag.includes('height='))
      .map((tag) => /src="([^"]*)"/.exec(tag)?.[1] ?? tag);

    assert.deepEqual(
      missing,
      [],
      `these images have no width/height: ${missing.join(', ')}`
    );
  });

  it('gives every image an alt attribute', () => {
    const missing = tags
      .filter((tag) => !tag.includes('alt='))
      .map((tag) => /src="([^"]*)"/.exec(tag)?.[1] ?? tag);

    assert.deepEqual(missing, [], 'every <img> needs alt, empty if decorative');
  });
});
