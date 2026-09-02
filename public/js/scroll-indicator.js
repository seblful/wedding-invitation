/**
 * The bouncing arrow at the bottom of the hero section.
 *
 * It is a real `<button>` in the markup now, so keyboard activation and the
 * accessible name come from the platform instead of a hand-rolled keydown
 * handler on an `<img role="button">`.
 */

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

  indicator.addEventListener('click', () => {
    window.scrollBy({
      top: window.innerHeight * SCROLL_STEP_FRACTION,
      behavior: 'smooth',
    });
  });

  const heroSection = root.querySelector('.first-section');
  if (!(heroSection instanceof HTMLElement)) return () => {};

  const updateVisibility = () => {
    const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
    const scrolledPast = window.scrollY > heroBottom * HIDE_AFTER_FRACTION;
    indicator.classList.toggle('scroll-indicator-hidden', scrolledPast);
    // Keep it out of the tab order once it is invisible.
    indicator.toggleAttribute('inert', scrolledPast);
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();

  return () => window.removeEventListener('scroll', updateVisibility);
}
