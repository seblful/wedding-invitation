/**
 * Wires the feature modules to the page.
 *
 * `startPage` is the seam: one call brings the whole page up, one call takes
 * it back down. `main.js` is the only caller in the browser and the tests are
 * the other, so the `root` parameter and the teardown every `init*` returns
 * both have a real consumer.
 *
 * Neither did before. `main.js` called each `init*` with no arguments and
 * threw the returned teardown away, so six modules documented a
 * `() => void` return that nothing in the browser ever called, and the `root`
 * parameter existed only so a test could pass a fake. The empty-root suite
 * then covered exactly the four modules whose interfaces happened to agree —
 * `petals` took no root, `venue-maps` and `rsvp-form` returned nothing, and
 * all three were left off the list rather than brought into line.
 *
 * Keep the top level of this file side-effect free: `main.js` owns the
 * bootstrap, and a test imports this one to drive it with a fake root.
 */

import { initCountdown } from './countdown.js';
import { initFloralDecor } from './floral-decor.js';
import { initFallingPetals } from './petals.js';
import { initRevealOnScroll } from './reveal-on-scroll.js';
import { initRsvpForm } from './rsvp-form.js';
import { initScrollIndicator } from './scroll-indicator.js';
import { initVenueMaps } from './venue-maps.js';

/**
 * The feature modules, in start order.
 *
 * The RSVP form goes first deliberately: a failure in one decoration must not
 * be able to take the form down with it.
 *
 * @type {ReadonlyArray<[string, (root?: Document | HTMLElement) => () => void]>}
 */
const FEATURES = Object.freeze([
  ['rsvp-form', initRsvpForm],
  ['countdown', initCountdown],
  ['venue-maps', initVenueMaps],
  ['scroll-indicator', initScrollIndicator],
  ['reveal-on-scroll', initRevealOnScroll],
  ['petals', initFallingPetals],
  ['floral-decor', initFloralDecor],
]);

/**
 * Starts every feature and returns one teardown for all of them.
 *
 * A module that throws on the way up is logged and skipped, and a module that
 * throws on the way down does not stop the rest from being torn down.
 *
 * @param {Document | HTMLElement} [root] defaults to the live document
 * @returns {() => void} teardown for the whole page
 */
export function startPage(root = document) {
  /** @type {Array<[string, () => void]>} */
  const started = [];

  for (const [name, init] of FEATURES) {
    try {
      const teardown = init(root);
      if (typeof teardown === 'function') started.push([name, teardown]);
    } catch (error) {
      console.error(`Failed to initialise "${name}":`, error);
    }
  }

  return () => {
    // Reverse order, so a module started later cannot be left holding a
    // reference to one that has already gone.
    for (const [name, teardown] of started.reverse()) {
      try {
        teardown();
      } catch (error) {
        console.error(`Failed to tear down "${name}":`, error);
      }
    }
    started.length = 0;
  };
}
