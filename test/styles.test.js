'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const STYLES_CSS = path.join(PUBLIC_DIR, 'styles.css');

/**
 * Utility families whose class names must resolve to a real rule.
 *
 * This guards a bug class that shipped for months: `text-primary`,
 * `text-secondary`, `bg-soft-peach`, `mb-1.25` and `text-decoration-none` were
 * all used in the markup but generated no CSS, so the styles silently did
 * nothing. Purely semantic hooks (`timeline-title`, `form-label`, ...) do not
 * match these prefixes and are ignored.
 */
const UTILITY_FAMILIES = [
  'bg',
  'text',
  'border',
  'font',
  'shadow',
  'rounded',
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'w',
  'h',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'gap',
  'gap-x',
  'gap-y',
  'z',
  'opacity',
  'order',
  'leading',
  'tracking',
  'translate-x',
  'translate-y',
  'scale',
];

const VARIANTS = [
  'hover',
  'focus',
  'focus-visible',
  'active',
  'sm',
  'md',
  'lg',
  'xl',
];

const UTILITY_PATTERN = new RegExp(
  `^-?(?:(?:${VARIANTS.join('|')}):)*-?(?:${UTILITY_FAMILIES.join('|')})-`
);

/** @returns {Set<string>} every class named in the markup */
function classesUsedInMarkup() {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const used = new Set();
  for (const match of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of match[1].split(/\s+/)) {
      if (name) used.add(name);
    }
  }
  return used;
}

/**
 * Every class `input.css` defines in its `@layer components` block.
 *
 * Only simple leading class selectors count: `.timeline-dot` yes,
 * `.timeline-item:nth-child(even) .timeline-content` contributes nothing new.
 *
 * @returns {Set<string>}
 */
function componentClasses() {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'input.css'), 'utf8');
  const layer = css.slice(css.indexOf('@layer components'));
  const names = new Set();
  for (const match of layer.matchAll(/^\s{2}\.([a-z][\w-]*)[\s,{:]/gm)) {
    names.add(match[1]);
  }
  return names;
}

/**
 * Tailwind escapes special characters in selectors (`.max-w-\[600px\]`).
 * Dropping the escapes makes a plain substring check reliable.
 *
 * @returns {string}
 */
function generatedSelectors() {
  const css =
    fs.readFileSync(STYLES_CSS, 'utf8') +
    fs.readFileSync(path.join(PUBLIC_DIR, 'custom.css'), 'utf8');
  return css.split(String.fromCharCode(92)).join('');
}

describe('generated stylesheet', () => {
  // `npm run build:css` produces this; it is gitignored.
  const built = fs.existsSync(STYLES_CSS);

  it('exists (run `npm run build:css`)', () => {
    assert.ok(built, `${STYLES_CSS} is missing — run \`npm run build:css\``);
  });

  it(
    'defines a rule for every utility class used in the markup',
    { skip: !built },
    () => {
      const css = generatedSelectors();
      const dead = [...classesUsedInMarkup()]
        .filter((name) => UTILITY_PATTERN.test(name))
        .filter((name) => !css.includes(`.${name}`))
        .sort();

      assert.deepEqual(
        dead,
        [],
        `these classes generate no CSS:\n  ${dead.join('\n  ')}\n` +
          'Either fix the class name or add the value to tailwind.config.js.'
      );
    }
  );

  it(
    'defines a rule for every component class the markup names',
    { skip: !built },
    () => {
      const css = generatedSelectors();
      const missing = [...componentClasses()]
        .filter((name) => !css.includes(`.${name}`))
        .sort();

      assert.deepEqual(
        missing,
        [],
        `input.css declares these but no rule reached the stylesheet:\n  ${missing.join('\n  ')}`
      );
    }
  );

  it('leaves no component class unused by the markup', { skip: !built }, () => {
    const used = classesUsedInMarkup();
    const orphans = [...componentClasses()]
      .filter((name) => !used.has(name))
      .sort();

    assert.deepEqual(
      orphans,
      [],
      `these component classes are dead — nothing in index.html uses them:\n  ${orphans.join('\n  ')}`
    );
  });

  it(
    'carries the theme palette through into the components',
    { skip: !built },
    () => {
      // The colours reach the page through `@apply` now rather than as utility
      // classes in the markup, so assert on the values themselves. Tailwind
      // fails the build on an `@apply` it cannot resolve, which is what makes
      // a typo here loud instead of silent.
      const css = fs.readFileSync(STYLES_CSS, 'utf8').toLowerCase();
      const { colors } = require('../palette.js');

      // Tailwind emits colours as `rgb(r g b / <alpha>)` so they stay
      // opacity-modifiable, so the hex itself is not what lands in the file.
      /** @param {string} hex */
      const asRgbChannels = (hex) => {
        const [, r, g, b] = /^#(\w{2})(\w{2})(\w{2})$/.exec(hex) ?? [];
        return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
      };

      for (const name of [
        'cream',
        'primary',
        'secondary',
        'beige',
        'burgundy',
      ]) {
        const hex = colors[name].toLowerCase();
        assert.ok(
          css.includes(hex) || css.includes(asRgbChannels(hex)),
          `${name} (${colors[name]}) never made it into the stylesheet`
        );
      }
    }
  );
});

describe('design tokens', () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'custom.css'), 'utf8');

  it('declares every custom property it reads', () => {
    // custom.css no longer carries colour defaults: palette.js declares them
    // and src/render.js renders them into the head. A property read here that
    // nothing declares is a value that silently resolves to nothing.
    const { customProperties } = require('../palette.js');

    /** Properties a client module writes as an inline style, e.g. by petals.js. */
    const setByScript = new Set(
      fs
        .readdirSync(path.join(PUBLIC_DIR, 'js'))
        .filter((name) => name.endsWith('.js'))
        .flatMap((name) => [
          ...fs
            .readFileSync(path.join(PUBLIC_DIR, 'js', name), 'utf8')
            .matchAll(/(--[\w-]+):/g),
        ])
        .map((match) => match[1])
    );

    const read = new Set(
      [...css.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1])
    );
    const declaredHere = new Set(
      [...css.matchAll(/^\s*(--[\w-]+):/gm)].map((match) => match[1])
    );

    const undeclared = [...read]
      .filter((name) => !declaredHere.has(name))
      .filter((name) => !(name in customProperties))
      .filter((name) => !setByScript.has(name))
      .sort();

    assert.deepEqual(
      undeclared,
      [],
      `nothing declares these: ${undeclared.join(', ')}`
    );
  });

  it('leaves no palette property unread', () => {
    // The palette is rendered on every page load, so a property nothing reads
    // is bytes in every response.
    const { customProperties } = require('../palette.js');
    const unread = Object.keys(customProperties).filter(
      (name) => !css.includes(`var(${name}`)
    );

    assert.deepEqual(
      unread,
      [],
      `custom.css reads none of these: ${unread.join(', ')}`
    );
  });

  it('declares no colour of its own', () => {
    // A hex here is a second copy of a palette value, which is how the body
    // grey came to be #555 in this file and #666 in tailwind.config.js.
    const declarations = [...css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)];
    const colours = declarations
      .filter(([, , value]) => /#[0-9a-fA-F]{3,8}\b/.test(value))
      .map(([, name]) => name);

    assert.deepEqual(
      colours,
      [],
      `move these to palette.js: ${colours.join(', ')}`
    );
  });

  it('references every custom property it declares', () => {
    // The palette was mirrored here in full while `tailwind.config.js` was the
    // real source, so ten of these had no reader and could drift from the
    // values actually rendering.
    const declared = [...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    const dead = declared.filter(
      (name) => css.split(`var(${name}`).length - 1 === 0
    );

    assert.deepEqual(
      dead,
      [],
      `nothing reads these tokens — delete them or use them: ${dead.join(', ')}`
    );
  });
});

describe('@font-face declarations', () => {
  const css = fs.readFileSync(path.join(PUBLIC_DIR, 'custom.css'), 'utf8');

  it('sets font-display to a literal value', () => {
    // `font-display: var(--font-display)` parsed as invalid and was dropped:
    // custom properties do not work in @font-face descriptors, so the fonts
    // silently fell back to `auto` and blocked text while they loaded.
    assert.ok(css.includes('font-display: swap;'), 'no font-display: swap');
    assert.ok(
      !/font-display:\s*var\(/.test(css),
      'font-display uses var(), which is not valid in an @font-face descriptor'
    );
  });

  it('declares the weight range of the variable family', () => {
    // Skolar PE carries a 300-700 wght axis. Declaring only `normal` made the
    // browser synthesise every bold on the page instead of using the real one.
    const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
    const skolar = faces.filter((f) => f.includes("font-family: 'Skolar PE'"));

    assert.ok(skolar.length > 0, 'no Skolar PE @font-face found');
    for (const face of skolar) {
      assert.match(
        face,
        /font-weight:\s*300 700;/,
        'a Skolar PE face does not declare its variable weight range'
      );
    }
  });
});
