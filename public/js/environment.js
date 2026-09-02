/**
 * Viewport and user-preference probes shared by the animation modules.
 *
 * Every helper reads live state rather than caching at load time — the old
 * script captured `isMobile()` once on DOMContentLoaded, so rotating a phone
 * left the decorations positioned for the wrong breakpoint.
 */

/** Matches the `max-width: 767px` breakpoint used throughout input.css. */
const MOBILE_QUERY = '(max-width: 767px)';
const SMALL_MOBILE_QUERY = '(max-width: 375px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * @param {string} query
 * @returns {boolean}
 */
function matches(query) {
  return window.matchMedia(query).matches;
}

/** @returns {boolean} */
export function isMobile() {
  return matches(MOBILE_QUERY);
}

/** @returns {boolean} */
export function isSmallMobile() {
  return matches(SMALL_MOBILE_QUERY);
}

/**
 * Guests who ask their OS for reduced motion get the layout without the
 * falling petals or the scroll-driven floral drift.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return matches(REDUCED_MOTION_QUERY);
}

/**
 * Coalesces bursts of calls into one per animation frame.
 *
 * @template {(...args: never[]) => void} F
 * @param {F} callback
 * @returns {(...args: Parameters<F>) => void}
 */
export function rafThrottle(callback) {
  let frame = 0;
  return (...args) => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      callback(...args);
    });
  };
}

/**
 * Runs `callback` once the resize storm settles.
 *
 * @template {(...args: never[]) => void} F
 * @param {F} callback
 * @param {number} [delayMs]
 * @returns {(...args: Parameters<F>) => void}
 */
export function debounce(callback, delayMs = 150) {
  /** @type {number | undefined} */
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delayMs);
  };
}

/**
 * Invokes `callback` whenever the viewport changes in a way that could move the
 * decorations: resize, and the orientation change that does not always fire a
 * resize on iOS.
 *
 * @param {() => void} callback
 * @returns {() => void} unsubscribe
 */
export function onViewportChange(callback) {
  const handler = debounce(callback);
  window.addEventListener('resize', handler, { passive: true });
  window.addEventListener('orientationchange', handler, { passive: true });
  return () => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
  };
}
