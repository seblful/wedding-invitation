'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');

const JS_DIR = path.join(__dirname, '..', 'public', 'js');

/** @param {string} name */
function importModule(name) {
  return import(new URL(`../public/js/${name}`, `file://${__filename}`).href);
}

describe('module graph', () => {
  const files = fs
    .readdirSync(JS_DIR)
    .filter((name) => name.endsWith('.js'))
    .sort();

  it('every feature module parses and evaluates outside a browser', async () => {
    // Catches top-level DOM access, which makes a module impossible to unit
    // test. main.js is exempt: bootstrapping the page is its whole job.
    for (const file of files.filter((name) => name !== 'main.js')) {
      await importModule(file);
    }
  });

  it('is reachable in full from main.js', async () => {
    const reachable = new Set(['main.js']);
    const queue = ['main.js'];

    while (queue.length > 0) {
      const source = fs.readFileSync(path.join(JS_DIR, queue.shift()), 'utf8');
      for (const match of source.matchAll(/from\s+'\.\/([^']+)'/g)) {
        if (!reachable.has(match[1])) {
          reachable.add(match[1]);
          queue.push(match[1]);
        }
      }
    }

    assert.deepEqual(
      files.filter((file) => !reachable.has(file)),
      [],
      'these modules are never imported — dead code'
    );
  });
});

describe('countdown: splitDuration', () => {
  it('splits a duration into whole units', async () => {
    const { splitDuration } = await importModule('countdown.js');
    const ms = 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5 * 1000 + 999;

    assert.deepEqual(splitDuration(ms), {
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it('is all zeros at the target moment', async () => {
    const { splitDuration } = await importModule('countdown.js');
    assert.deepEqual(splitDuration(0), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('clamps a past date to zero instead of counting up', async () => {
    const { splitDuration } = await importModule('countdown.js');
    assert.deepEqual(splitDuration(-500_000), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('handles the real wedding date without overflow', async () => {
    const { splitDuration } = await importModule('countdown.js');
    const content = require('../src/config.js').loadContent();
    const parts = splitDuration(Date.parse(content.weddingDate) - Date.now());

    for (const [unit, value] of Object.entries(parts)) {
      assert.ok(Number.isInteger(value) && value >= 0, `${unit} is ${value}`);
    }
    assert.ok(parts.hours < 24);
    assert.ok(parts.minutes < 60);
    assert.ok(parts.seconds < 60);
  });
});

describe('init functions', () => {
  const entries = [
    ['countdown.js', 'initCountdown'],
    ['rsvp-form.js', 'initRsvpForm'],
    ['scroll-indicator.js', 'initScrollIndicator'],
    ['reveal-on-scroll.js', 'initRevealOnScroll'],
    ['venue-maps.js', 'initVenueMaps'],
    ['petals.js', 'initFallingPetals'],
    ['floral-decor.js', 'initFloralDecor'],
  ];

  for (const [file, name] of entries) {
    it(`${file} exports ${name}`, async () => {
      const module = await importModule(file);
      assert.equal(typeof module[name], 'function', `${name} is not exported`);
    });
  }
});

describe('init functions tolerate a root with none of their markup', () => {
  // Each init guards its markup with `instanceof HTMLElement`, which needs the
  // constructor to exist even when the answer is "no". Defining it is enough
  // to drive the missing-markup path without a full DOM.
  const emptyRoot = { querySelector: () => null, querySelectorAll: () => [] };

  before(() => {
    globalThis.HTMLElement = class HTMLElement {};
  });

  after(() => {
    delete globalThis.HTMLElement;
  });

  const entries = [
    ['countdown.js', 'initCountdown'],
    ['reveal-on-scroll.js', 'initRevealOnScroll'],
    ['scroll-indicator.js', 'initScrollIndicator'],
    // floral-decor used to query `document` directly and could not be reached
    // from a test at all.
    ['floral-decor.js', 'initFloralDecor'],
  ];

  for (const [file, name] of entries) {
    it(`${name} returns a teardown instead of throwing`, async () => {
      const module = await importModule(file);
      const teardown = module[name](emptyRoot);

      assert.equal(typeof teardown, 'function', `${name} returned no teardown`);
      assert.doesNotThrow(teardown, `${name}'s teardown threw`);
    });
  }
});

describe('floral-decor position table', () => {
  // Read out of the source rather than exported: the table is data the module
  // shares with the markup, not part of its interface. `test/styles.test.js`
  // reads input.css the same way.
  const table = (() => {
    const source = fs.readFileSync(
      path.join(JS_DIR, 'floral-decor.js'),
      'utf8'
    );
    return source.slice(
      source.indexOf('const FLOWERS'),
      source.indexOf('CROPPED_FADE_FRACTION')
    );
  })();

  /** Each entry as `{ selector, body }`, body being everything up to the next. */
  const entries = (() => {
    const starts = [...table.matchAll(/'\.([\w-]+)':/g)];
    return starts.map((match, index) => ({
      selector: match[1],
      body: table.slice(
        match.index + match[0].length,
        starts[index + 1]?.index ?? table.length
      ),
    }));
  })();

  /** Every `.p-*` placement class the markup puts on a flower piece. */
  const markupFlowers = (() => {
    const html = fs.readFileSync(
      path.join(__dirname, '..', 'public', 'index.html'),
      'utf8'
    );
    const found = new Set();
    for (const [, classList] of html.matchAll(
      /class="flower-piece ([^"]*)"/g
    )) {
      for (const name of classList.split(/\s+/)) {
        if (/^p-[a-z]{2}-/.test(name)) found.add(name);
      }
    }
    return found;
  })();

  it('finds a flower on both sides', () => {
    // Guards the two readers above against silently matching nothing.
    assert.ok(entries.length > 0, 'no entries parsed out of FLOWERS');
    assert.ok(markupFlowers.size > 0, 'no flower pieces found in index.html');
  });

  it('positions only flowers the markup actually carries', () => {
    // measureFlowers skips a selector it cannot find, so a target for an
    // element that is not on the page is maintained for nothing. `.p-br-c2`
    // had a target, a custom.css rule and an image, and no <img> using them.
    const absent = entries
      .map(({ selector }) => selector)
      .filter((selector) => !markupFlowers.has(selector));

    assert.deepEqual(
      absent,
      [],
      `FLOWERS positions these, but no flower piece in index.html carries the class: ${absent.join(', ')}`
    );
  });

  it('positions every flower the markup carries', () => {
    // The other direction: a piece with no target is left where custom.css
    // put it while the rest of its corner drifts away.
    const targeted = new Set(entries.map(({ selector }) => selector));
    const unpositioned = [...markupFlowers].filter(
      (name) => !targeted.has(name)
    );

    assert.deepEqual(
      unpositioned,
      [],
      `these flower pieces have no entry in FLOWERS: ${unpositioned.join(', ')}`
    );
  });

  it('anchors each breakpoint to exactly one vertical edge', () => {
    // measureFlowers reads the anchor off the target's own key, so an entry
    // naming both edges, or neither, has no defined vertical anchor.
    for (const { selector, body } of entries) {
      for (const breakpoint of ['desktop', 'mobile']) {
        const target = new RegExp(`${breakpoint}: \\{([^}]*)\\}`).exec(
          body
        )?.[1];
        assert.ok(target, `.${selector} has no ${breakpoint} target`);

        const edges = ['top', 'bottom'].filter((edge) =>
          new RegExp(`\\b${edge}:`).test(target)
        );
        assert.equal(
          edges.length,
          1,
          `.${selector} ${breakpoint} names ${edges.length} vertical edges (${edges.join(', ')})`
        );
      }
    }
  });
});

describe('RSVP form', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'index.html'),
    'utf8'
  );
  const source = fs.readFileSync(path.join(JS_DIR, 'rsvp-form.js'), 'utf8');

  /**
   * The whole `<input>` / `<select>` tag carrying a given name.
   *
   * @param {string} name
   * @returns {string | null}
   */
  function tagWithName(name) {
    const at = html.indexOf(`name="${name}"`);
    if (at === -1) return null;
    const open = html.lastIndexOf('<', at);
    const close = html.indexOf('>', at);
    return open === -1 || close === -1 ? null : html.slice(open, close + 1);
  }

  it('builds the payload out of the form itself', () => {
    // No field table to drift from the markup: the keys are whatever the
    // browser would post natively.
    assert.match(
      source,
      /new FormData\(form\)/,
      'the scripted payload has to be the native post'
    );
  });

  it('shares no string with the markup that the markup does not carry', () => {
    // Every snake_case literal left in the module is a name or an option
    // value the markup must also spell. `second_day_attendance` here against
    // `attendance_second_day` in the HTML is exactly what shipped once.
    const literals = [
      ...new Set(
        [...source.matchAll(/'([a-z][a-z0-9]*(?:_[a-z0-9]+)+)'/g)].map(
          (match) => match[1]
        )
      ),
    ];

    assert.ok(literals.length > 0, 'expected at least the attendance value');

    const absent = literals.filter(
      (value) =>
        !html.includes(`name="${value}"`) && !html.includes(`value="${value}"`)
    );

    assert.deepEqual(
      absent,
      [],
      `rsvp-form.js names these, and index.html has neither a control nor an option for them: ${absent.join(', ')}`
    );
  });

  it('marks the mandatory questions required in the markup', () => {
    // `missingRequired` reads `required` live off each control, so the markup
    // is what decides which questions a guest cannot skip.
    for (const name of ['guest_name', 'attendance', 'attendance_second_day']) {
      const tag = tagWithName(name);
      assert.ok(tag, `no control in index.html with name="${name}"`);
      assert.ok(
        tag.includes('required'),
        `${name} is a mandatory question but is not marked required`
      );
    }
  });

  it('leaves the partner name optional until the guest opts in', () => {
    // js/rsvp-form.js sets `required` on it when attendance says a partner is
    // coming; marking it in the markup would demand it from everyone.
    const tag = tagWithName('partner_name');
    assert.ok(tag, 'no control with name="partner_name"');
    assert.ok(
      !tag.includes('required'),
      'partner_name must not be required in the markup'
    );
    assert.match(source, /partnerInput\.required = visible/);
  });
});
