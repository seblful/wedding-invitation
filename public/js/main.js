/**
 * Entry point. Wires the feature modules to the page.
 *
 * Each `init*` function is defensive about missing markup and returns a
 * teardown function, so the modules stay independently testable and a failure
 * in one decoration cannot take the RSVP form down with it.
 */

import { initCountdown } from './countdown.js';
import { initFloralDecor } from './floral-decor.js';
import { initFallingPetals } from './petals.js';
import { initRevealOnScroll } from './reveal-on-scroll.js';
import { initRsvpForm } from './rsvp-form.js';
import { initScrollIndicator } from './scroll-indicator.js';
import { initVenueMaps } from './venue-maps.js';

/**
 * @param {string} name
 * @param {() => void} init
 */
function safely(name, init) {
  try {
    init();
  } catch (error) {
    console.error(`Failed to initialise "${name}":`, error);
  }
}

function main() {
  // Every module works from the rendered HTML alone.
  safely('rsvp-form', initRsvpForm);
  safely('countdown', initCountdown);
  safely('venue-maps', initVenueMaps);
  safely('scroll-indicator', initScrollIndicator);
  safely('reveal-on-scroll', initRevealOnScroll);
  safely('petals', initFallingPetals);
  safely('floral-decor', initFloralDecor);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
