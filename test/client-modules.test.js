'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');

const { loadContent } = require('../src/config.js');
const { INDEX_TEMPLATE, PUBLIC_DIR } = require('../src/paths.js');
const { renderIndexHtml } = require('../src/render.js');

const JS_DIR = path.join(PUBLIC_DIR, 'js');

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

/** Every feature module and the init it exports. All seven, no exemptions. */
const FEATURES = [
  ['countdown.js', 'initCountdown'],
  ['rsvp-form.js', 'initRsvpForm'],
  ['scroll-indicator.js', 'initScrollIndicator'],
  ['reveal-on-scroll.js', 'initRevealOnScroll'],
  ['venue-maps.js', 'initVenueMaps'],
  ['petals.js', 'initFallingPetals'],
  ['floral-decor.js', 'initFloralDecor'],
];

describe('init functions', () => {
  for (const [file, name] of FEATURES) {
    it(`${file} exports ${name}`, async () => {
      const module = await importModule(file);
      assert.equal(typeof module[name], 'function', `${name} is not exported`);
    });
  }
});

describe('init functions tolerate a root with none of their markup', () => {
  // All seven, with no exemptions: (root) => teardown is the whole interface,
  // and driving every module through it with a root carrying none of their
  // markup is what proves they honour it. Three used to break the convention
  // — petals took no root and appended onto document.body, venue-maps and
  // rsvp-form returned nothing — and this list simply left those three out.
  //
  // Each init guards its markup with an `instanceof` check, which needs the
  // constructor to exist even when the answer is "no". Defining them is
  // enough to drive the missing-markup path without a full DOM.
  const emptyRoot = { querySelector: () => null, querySelectorAll: () => [] };

  const DOM_CONSTRUCTORS = [
    'HTMLElement',
    'HTMLFormElement',
    'HTMLInputElement',
    'HTMLSelectElement',
  ];

  before(() => {
    for (const name of DOM_CONSTRUCTORS) {
      globalThis[name] = class {};
    }
  });

  after(() => {
    for (const name of DOM_CONSTRUCTORS) {
      delete globalThis[name];
    }
  });

  for (const [file, name] of FEATURES) {
    it(`${name} returns a teardown instead of throwing`, async () => {
      const module = await importModule(file);
      const teardown = module[name](emptyRoot);

      assert.equal(typeof teardown, 'function', `${name} returned no teardown`);
      assert.doesNotThrow(teardown, `${name}'s teardown threw`);
    });
  }

  it('brings the whole page up and back down through one seam', async () => {
    // startPage is the interface main.js and this test both cross, which is
    // what gives the root parameter and the teardown a real caller. main.js
    // used to call each init with no arguments and drop every teardown.
    const { startPage } = await importModule('page.js');

    let teardown;
    assert.doesNotThrow(() => {
      teardown = startPage(emptyRoot);
    }, 'startPage threw on a root with no markup');

    assert.equal(typeof teardown, 'function', 'startPage returned no teardown');
    assert.doesNotThrow(teardown, "startPage's teardown threw");
    assert.doesNotThrow(teardown, 'tearing down twice threw');
  });
});

describe('the corner flowers', () => {
  // flowers.js is the one place a flower is described and src/render.js
  // renders it, so these assert on that table and on the markup it produces
  // rather than on the module's source. The old versions sliced a `FLOWERS`
  // table out of floral-decor.js with a regex and matched it against
  // index.html, because the same flower was declared in three files.
  const { CORNERS, FLOWERS } = require('../flowers.js');
  const html = renderIndexHtml(
    fs.readFileSync(INDEX_TEMPLATE, 'utf8'),
    loadContent()
  );

  /** Every rendered flower's `<img>` tag. */
  const rendered = [
    ...html.matchAll(/<img[\s\S]*?data-flower-anchor[\s\S]*?\/>/g),
  ].map((match) => match[0]);

  it('renders one image per entry, and no others', () => {
    assert.ok(FLOWERS.length > 0, 'flowers.js is empty');
    assert.equal(
      rendered.length,
      FLOWERS.length,
      'the page carries a different number of flowers than the table declares'
    );
  });

  it('puts every flower in a corner group that exists', () => {
    const strays = FLOWERS.map((f) => f.corner).filter(
      (corner) => !CORNERS.includes(corner)
    );
    assert.deepEqual(strays, [], `no such corner group: ${strays.join(', ')}`);

    for (const corner of CORNERS) {
      assert.match(
        html,
        new RegExp(`class="corner-group ${corner}-group"`),
        `${corner} group is not rendered`
      );
    }
  });

  it('anchors each flower to exactly one edge per axis', () => {
    // The runtime used to recover the horizontal anchor by asking the
    // stylesheet, via getComputedStyle(element).left !== 'auto'.
    for (const { asset, anchor } of FLOWERS) {
      assert.ok(['left', 'right'].includes(anchor.x), `${asset}: ${anchor.x}`);
      assert.ok(['top', 'bottom'].includes(anchor.y), `${asset}: ${anchor.y}`);
    }
  });

  it('gives every flower a finite start, both targets and both widths', () => {
    for (const flower of FLOWERS) {
      const { asset, start, target, width } = flower;
      for (const [label, point] of [
        ['start', start],
        ['desktop target', target.desktop],
        ['mobile target', target.mobile],
      ]) {
        assert.ok(
          Number.isFinite(point.x) && Number.isFinite(point.y),
          `${asset} has a non-finite ${label}`
        );
      }
      assert.ok(width.desktop > 0 && width.mobile > 0, `${asset} has no width`);
    }
  });

  it('ships the image every flower names', () => {
    const dir = path.join(PUBLIC_DIR, 'images', 'background');
    const missing = FLOWERS.map((f) => f.asset).filter(
      (asset) => !fs.existsSync(path.join(dir, asset))
    );
    assert.deepEqual(missing, [], `no such image: ${missing.join(', ')}`);
  });

  it('places every flower inline, so it is positioned on first paint', () => {
    for (const tag of rendered) {
      assert.match(
        tag,
        /style="(?:left|right): -?[\d.]+%; (?:top|bottom): -?[\d.]+%;/,
        `a flower rendered without an inline position:
${tag}`
      );
    }
  });

  it('reads exactly the placement attributes it renders', () => {
    // The same shape as the RSVP field names below: the renderer writes these
    // and the browser module reads them, so a rename has to move both.
    const source = fs.readFileSync(
      path.join(JS_DIR, 'floral-decor.js'),
      'utf8'
    );

    const written = new Set(
      [...rendered.join('').matchAll(/(data-flower-[\w-]+)=/g)].map((m) => m[1])
    );
    assert.ok(written.size >= 4, 'no placement attributes were rendered');

    const unread = [...written].filter((name) => !source.includes(name)).sort();
    assert.deepEqual(
      unread,
      [],
      `src/render.js writes these but floral-decor.js never reads them: ${unread.join(', ')}`
    );

    const unwritten = [
      ...new Set(
        [...source.matchAll(/'(data-flower-[\w-]+)'/g)].map((m) => m[1])
      ),
    ]
      .filter((name) => !written.has(name))
      .sort();
    assert.deepEqual(
      unwritten,
      [],
      `floral-decor.js reads these but nothing renders them: ${unwritten.join(', ')}`
    );
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
