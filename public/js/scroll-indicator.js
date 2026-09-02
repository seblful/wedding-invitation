/**
 * The bouncing arrow at the bottom of the hero section.
 *
 * It is a real `<button>` in the markup now, so keyboard activation and the
 * accessible name come from the platform instead of a hand-rolled keydown
 * handler on an `<img role="button">`.
 */

import { onViewportChange } from './environment.js';

/** Fraction of the hero section scrolled past before the arrow fades out. */
const HIDE_AFTER_FRACTION = 0.3;

/** How far one press scrolls, as a fraction of the viewport height. */
const SCROLL_STEP_FRACTION = 0.5;

/**
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown
 */
export function initScrollIndicator(root = document) {
  const indicator = root.querySelector('.scroll-indicator');
  if (!(indicator instanceof HTMLElement)) return () => {};

  const onClick = () => {
    window.scrollBy({
      top: window.innerHeight * SCROLL_STEP_FRACTION,
      behavior: 'smooth',
    });
  };
  indicator.addEventListener('click', onClick);

  /** Every teardown collected so far, so an early return still cleans up. */
  const cleanups = [() => indicator.removeEventListener('click', onClick)];
  const teardown = () => {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
  };

  const heroSection = root.querySelector('.first-section');
  if (!(heroSection instanceof HTMLElement)) return teardown;

  // Cached: reading offsetTop/offsetHeight forces layout, and this runs on
  // every scroll event.
  let hideThreshold = 0;
  const measure = () => {
    hideThreshold =
      (heroSection.offsetTop + heroSection.offsetHeight) * HIDE_AFTER_FRACTION;
  };

  const updateVisibility = () => {
    const scrolledPast = window.scrollY > hideThreshold;
    indicator.classList.toggle('scroll-indicator-hidden', scrolledPast);
    // Keep it out of the tab order once it is invisible.
    indicator.toggleAttribute('inert', scrolledPast);
  };

  const onResize = () => {
    measure();
    updateVisibility();
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', updateVisibility));
  cleanups.push(onViewportChange(onResize));

  measure();
  updateVisibility();

  return teardown;
}
