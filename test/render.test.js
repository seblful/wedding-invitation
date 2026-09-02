'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const palette = require('../palette.js');
const { loadContent } = require('../src/config.js');
const {
  escapeHtml,
  absoluteUrl,
  buildSocialTags,
  buildReplacements,
  renderIndexHtml,
  TemplateError,
} = require('../src/render.js');

const content = loadContent();

const TEMPLATE = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'index.html'),
  'utf8'
);

describe('escapeHtml', () => {
  it('escapes the five characters that break markup', () => {
    assert.equal(
      escapeHtml(`<a href="x" title='y'>&</a>`),
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('leaves Cyrillic text alone', () => {
    assert.equal(escapeHtml('Вяселле'), 'Вяселле');
  });

  it("escapes the apostrophe in names such as Дар'і", () => {
    assert.equal(escapeHtml("Дар'і"), 'Дар&#39;і');
  });
});

describe('absoluteUrl', () => {
  it('joins an origin and a relative path', () => {
    assert.equal(
      absoluteUrl('https://example.test', 'images/preview.png'),
      'https://example.test/images/preview.png'
    );
  });

  it('tolerates a trailing slash on the origin and a leading one on the path', () => {
    assert.equal(
      absoluteUrl('https://example.test///', '/images/preview.png'),
      'https://example.test/images/preview.png'
    );
  });
});

describe('buildSocialTags', () => {
  const tags = buildSocialTags(content);

  it('makes the Open Graph image absolute', () => {
    assert.match(
      tags,
      /property="og:image" content="https:\/\/[^"]+preview\.png"/
    );
  });

  it('emits both Open Graph and Twitter cards', () => {
    for (const property of [
      'og:title',
      'og:description',
      'og:url',
      'og:type',
    ]) {
      assert.ok(tags.includes(`property="${property}"`), `missing ${property}`);
    }
    for (const name of ['twitter:card', 'twitter:title', 'twitter:image']) {
      assert.ok(tags.includes(`name="${name}"`), `missing ${name}`);
    }
  });

  it('escapes content rather than emitting a raw quote', () => {
    const tricky = {
      ...content,
      openGraph: { ...content.openGraph, title: 'He said "hi"' },
    };
    const output = buildSocialTags(tricky);
    assert.ok(output.includes('content="He said &quot;hi&quot;"'));
  });
});

describe('renderIndexHtml', () => {
  const html = renderIndexHtml(TEMPLATE, content);

  it('leaves no placeholder behind in the real template', () => {
    assert.equal(html.match(/[A-Z][A-Z0-9_]*_PLACEHOLDER/g), null);
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
    // custom.css declares none of these itself, so a property missing here is
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
    // would corrupt it. buildThemeVars checks the value instead.
    const themeBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
    assert.ok(themeBlock.includes('--bg-primary'), 'no theme block rendered');
    assert.ok(!themeBlock.includes('&'), `escaped value in ${themeBlock}`);
  });

  it('refuses a value that is not a hex colour', () => {
    // A `url(...)` or a stray `}` in this position would close the rule and
    // let the rest of the value become CSS of its own. Escaping cannot help
    // inside <style>, so the render fails instead.
    const { buildThemeVars } = require('../src/render.js');

    for (const bad of ['red; } body { display: none', 'url(x)', '']) {
      assert.throws(
        () => buildThemeVars({ '--bg-primary': bad }),
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
    const { buildThemeVars } = require('../src/render.js');
    assert.match(buildThemeVars({ '--x': '#abc' }), /--x: #abc;/);
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
  it('declares a slot for every replacement render.js knows about', () => {
    for (const token of Object.keys(buildReplacements(content))) {
      assert.ok(
        TEMPLATE.includes(token),
        `public/index.html is missing ${token}`
      );
    }
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
