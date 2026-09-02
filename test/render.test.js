'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const { content } = require('../src/config.js');
const {
  escapeHtml,
  absoluteUrl,
  buildSocialTags,
  buildClientConfig,
  buildReplacements,
  renderIndexHtml,
  TemplateError,
} = require('../src/render.js');

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

describe('buildClientConfig', () => {
  const clientConfig = buildClientConfig(content);

  it('exposes exactly the keys the browser needs', () => {
    assert.deepEqual(Object.keys(clientConfig).sort(), [
      'formspreeEndpoint',
      'location',
      'secondDayLocation',
      'timezone',
      'weddingDate',
    ]);
  });

  it('serialises to JSON without losing the wedding date', () => {
    const roundTripped = JSON.parse(JSON.stringify(clientConfig));
    assert.equal(
      Date.parse(roundTripped.weddingDate),
      Date.parse(content.weddingDate)
    );
  });

  it('keys the venues by the names the markup asks for', () => {
    // public/index.html uses data-venue="location" / "secondDayLocation".
    for (const key of ['location', 'secondDayLocation']) {
      assert.ok(clientConfig[key].yandexMapUrl, `${key} has no map URL`);
    }
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

  it('injects the palette as custom properties', () => {
    assert.ok(html.includes(`--bg-primary: ${content.themeColor};`));
    assert.ok(html.includes(`--section-bg: ${content.backgroundColor};`));
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

  it('pairs every error message with a field that exists', () => {
    for (const match of TEMPLATE.matchAll(/data-for="([^"]+)"/g)) {
      assert.ok(
        TEMPLATE.includes(`id="${match[1]}"`),
        `.form-error[data-for="${match[1]}"] has no matching field`
      );
    }
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
