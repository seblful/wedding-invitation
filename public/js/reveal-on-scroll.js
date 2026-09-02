/**
 * Fades elements in the first time they scroll into view.
 *
 * Opt in from the markup with `data-reveal`; the element gets a `visible`
 * class once its section is far enough on screen.
 */

const OBSERVER_OPTIONS = { rootMargin: '-10% 0px', threshold: 0.5 };

/**
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown
 */
export function initRevealOnScroll(root = document) {
  const targets = root.querySelectorAll('[data-reveal]');
  if (targets.length === 0) return () => {};

  // Without IntersectionObserver, show everything rather than nothing.
  if (!('IntersectionObserver' in window)) {
    for (const target of targets) target.classList.add('visible');
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      // One-shot: nothing re-hides on scroll back up.
      observer.unobserve(entry.target);
    }
  }, OBSERVER_OPTIONS);

  for (const target of targets) observer.observe(target);

  return () => observer.disconnect();
}
