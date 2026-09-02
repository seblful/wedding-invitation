'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

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
    const { content } = require('../src/config.js');
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
