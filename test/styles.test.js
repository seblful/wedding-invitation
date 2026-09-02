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
    'includes the theme colours the markup relies on',
    { skip: !built },
    () => {
      const css = generatedSelectors();
      for (const name of [
        'bg-cream',
        'bg-soft-peach',
        'text-primary',
        'text-secondary',
      ]) {
        assert.ok(
          css.includes(`.${name}`),
          `.${name} is not in the stylesheet`
        );
      }
    }
  );
});
