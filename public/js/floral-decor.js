/**
 * Scroll-driven floral corner decorations.
 *
 * The flowers start clustered, drift out to the page edges while the hero
 * section scrolls away, and drift back in over the closing section. Cropped
 * pieces cross-fade instead of moving.
 *
 * Every position is read off the element itself, the same way `countdown.js`
 * reads `data-wedding-date`. `flowers.js` is the one place a flower is
 * described and `src/render.js` renders it, so there is no table here to keep
 * in step with the stylesheet and the markup — and no `getComputedStyle` call
 * asking the stylesheet which edge a flower is pinned to.
 *
 * To move a flower, edit `flowers.js`.
 */

import {
  isMobile,
  isSmallMobile,
  onViewportChange,
  prefersReducedMotion,
  rafThrottle,
} from './environment.js';

/** Cropped pieces have finished fading by this much of the hero scroll. */
const CROPPED_FADE_FRACTION = 0.7;

/** Movement below this threshold is not worth a style write on mobile. */
const MOBILE_EPSILON = Object.freeze({ position: 0.1, scale: 0.01 });

/** @returns {{ initial: number, final: number }} */
function scaleProfile() {
  if (isSmallMobile()) return { initial: 1.3, final: 1.4 };
  if (isMobile()) return { initial: 1.4, final: 1.5 };
  return { initial: 1, final: 0.75 };
}

/**
 * Reads an `x y` pair of percentages off a data attribute.
 *
 * @param {HTMLElement} element
 * @param {string} attribute
 * @returns {{ x: number, y: number } | null} null when absent or malformed
 */
function readPoint(element, attribute) {
  const parts = (element.getAttribute(attribute) ?? '').trim().split(/\s+/);
  if (parts.length !== 2) return null;

  const [x, y] = parts.map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/**
 * @typedef {object} Flower
 * @property {HTMLElement} element
 * @property {boolean} anchorLeft
 * @property {boolean} anchorTop
 * @property {boolean} isCropped
 * @property {number} startX
 * @property {number} startY
 * @property {number} targetX
 * @property {number} targetY
 * @property {{ x: number, y: number, scale: number } | null} lastWrite
 */

/**
 * Every flower on the page, with the placement `src/render.js` wrote onto it.
 *
 * No layout is read and nothing is measured: the numbers are percentages of
 * the corner group already, so a resize only changes which target applies.
 * This used to strip the inline styles and call `getComputedStyle` on each
 * piece — fifteen forced layouts per resize — because the start position was
 * the stylesheet's and only the target was declared.
 *
 * @param {Document | HTMLElement} root
 * @returns {Flower[]}
 */
function readFlowers(root) {
  const targetAttribute = isMobile()
    ? 'data-flower-target-mobile'
    : 'data-flower-target';

  /** @type {Flower[]} */
  const flowers = [];

  for (const element of root.querySelectorAll('[data-flower-anchor]')) {
    if (!(element instanceof HTMLElement)) continue;

    const [anchorX, anchorY] = (
      element.getAttribute('data-flower-anchor') ?? ''
    ).split(/\s+/);
    const start = readPoint(element, 'data-flower-start');
    const target = readPoint(element, targetAttribute);
    if (!start || !target) continue;

    flowers.push({
      element,
      anchorLeft: anchorX !== 'right',
      anchorTop: anchorY !== 'bottom',
      isCropped: element.classList.contains('cropped-flower'),
      startX: start.x,
      startY: start.y,
      targetX: target.x,
      targetY: target.y,
      lastWrite: null,
    });
  }

  return flowers;
}

/**
 * @param {Flower} flower
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 */
function place(flower, x, y, scale) {
  const { element } = flower;
  if (flower.anchorLeft) element.style.left = `${x}%`;
  else element.style.right = `${100 - x}%`;

  if (flower.anchorTop) element.style.top = `${y}%`;
  else element.style.bottom = `${y}%`;

  element.style.transform = `scale(${scale})`;
}

/**
 * @param {number} from
 * @param {number} to
 * @param {number} progress 0..1
 * @returns {number}
 */
function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

/**
 * Snaps the flowers to their resting layout without wiring up scrolling — used
 * when the guest has asked for reduced motion.
 *
 * @param {Flower[]} flowers
 * @param {number} scale
 */
function settle(flowers, scale) {
  for (const flower of flowers) {
    if (flower.isCropped) {
      flower.element.style.opacity = '0';
      continue;
    }
    flower.element.style.opacity = '1';
    place(flower, flower.targetX, flower.targetY, scale);
  }
}

/**
 * Starts the scroll-linked floral animation.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown
 */
export function initFloralDecor(root = document) {
  const heroSection = root.querySelector('.first-section');
  if (!(heroSection instanceof HTMLElement)) return () => {};

  const closingSection = root.querySelector('.closing-section');

  let flowers = readFlowers(root);
  if (flowers.length === 0) return () => {};

  if (prefersReducedMotion()) {
    settle(flowers, scaleProfile().final);
    return () => {};
  }

  let scale = scaleProfile();
  let compact = isMobile();

  /**
   * Layout reads are hoisted out of the scroll handler: `offsetHeight` and
   * `offsetTop` force a synchronous layout, and doing that on every scroll
   * frame is what made the decoration janky on mid-range phones. Nothing here
   * changes without a resize or a late-loading image.
   *
   * @type {{ heroHeight: number, closingTop: number, viewportHeight: number }}
   */
  let metrics = { heroHeight: 0, closingTop: 0, viewportHeight: 0 };

  function measureMetrics() {
    metrics = {
      heroHeight: heroSection.offsetHeight || window.innerHeight,
      closingTop:
        closingSection instanceof HTMLElement ? closingSection.offsetTop : 0,
      viewportHeight: window.innerHeight,
    };
  }

  function render() {
    const scrollY = window.scrollY;
    const { heroHeight, closingTop, viewportHeight } = metrics;

    const heroProgress = Math.min(scrollY / heroHeight, 1);
    const closingProgress = Math.min(
      Math.max((scrollY + viewportHeight - closingTop) / viewportHeight, 0),
      1
    );
    const inClosingPhase = closingProgress > 0;

    for (const flower of flowers) {
      if (flower.isCropped) {
        const opacity = inClosingPhase
          ? closingProgress
          : 1 - Math.min(heroProgress / CROPPED_FADE_FRACTION, 1);
        flower.element.style.opacity = opacity.toFixed(3);
        continue;
      }

      // Outbound during the hero, reversed during the closing section.
      const progress = inClosingPhase ? closingProgress : heroProgress;
      const x = inClosingPhase
        ? lerp(flower.targetX, flower.startX, progress)
        : lerp(flower.startX, flower.targetX, progress);
      const y = inClosingPhase
        ? lerp(flower.targetY, flower.startY, progress)
        : lerp(flower.startY, flower.targetY, progress);
      const currentScale = inClosingPhase
        ? lerp(scale.final, scale.initial, progress)
        : lerp(scale.initial, scale.final, progress);

      const previous = flower.lastWrite;
      const worthWriting =
        !compact ||
        previous === null ||
        Math.abs(x - previous.x) > MOBILE_EPSILON.position ||
        Math.abs(y - previous.y) > MOBILE_EPSILON.position ||
        Math.abs(currentScale - previous.scale) > MOBILE_EPSILON.scale;

      if (worthWriting) {
        place(flower, x, y, currentScale);
        flower.lastWrite = { x, y, scale: currentScale };
      }
    }
  }

  const onScroll = rafThrottle(render);

  function reset() {
    for (const flower of flowers) {
      if (flower.isCropped) continue;
      flower.element.style.opacity = '1';
      flower.element.style.transform = `scale(${scale.initial})`;
    }
    render();
  }

  // A resize can cross the breakpoint, which changes which target applies.
  // The numbers themselves are percentages, so nothing needs re-measuring.
  const stopViewportWatch = onViewportChange(() => {
    flowers = readFlowers(root);
    scale = scaleProfile();
    compact = isMobile();
    measureMetrics();
    reset();
  });

  // Images above the closing section settle late; its offsetTop moves with
  // them, so take the measurement again once they are in.
  const onLoad = () => {
    measureMetrics();
    render();
  };
  window.addEventListener('load', onLoad, { once: true });

  window.addEventListener('scroll', onScroll, { passive: true });
  measureMetrics();
  reset();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('load', onLoad);
    stopViewportWatch();
  };
}
