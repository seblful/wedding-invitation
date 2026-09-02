/**
 * Scroll-driven floral corner decorations.
 *
 * The flowers start clustered (as positioned in custom.css), drift out to the
 * page edges while the hero section scrolls away, and drift back in over the
 * closing section. Cropped pieces cross-fade instead of moving.
 *
 * Final positions live in the table below — edit those, not the maths.
 */

import {
  isMobile,
  isSmallMobile,
  onViewportChange,
  prefersReducedMotion,
  rafThrottle,
} from './environment.js';

/**
 * Every flower, one entry each.
 *
 * `left` is measured from the left edge of the corner group; a right-anchored
 * flower is placed at `right: (100 - left)%`. Whether an entry names `top` or
 * `bottom` is what anchors it vertically -- there is no separate table of
 * bottom-anchored selectors to keep in step, because the target already says.
 *
 * These are the positions after the hero has scrolled away, in percent of the
 * corner group. Mobile targets sit further inside the viewport so nothing
 * clips off a narrow screen. Edit these, not the maths.
 */
const FLOWERS = Object.freeze({
  '.p-tl-c1': { desktop: { left: 3, top: 2 }, mobile: { left: 6, top: 3 } },
  '.p-tl-1': { desktop: { left: 0, top: 20 }, mobile: { left: 4, top: 20 } },
  '.p-tl-2': { desktop: { left: 8, top: 3 }, mobile: { left: 10, top: 4 } },
  '.p-tl-3': { desktop: { left: 12, top: 40 }, mobile: { left: 13, top: 40 } },
  '.p-bl-c1': {
    desktop: { left: 3, bottom: 2 },
    mobile: { left: 6, bottom: 3 },
  },
  '.p-bl-c2': {
    desktop: { left: 15, bottom: 12 },
    mobile: { left: 16, bottom: 12 },
  },
  '.p-bl-1': {
    desktop: { left: 0, bottom: 17 },
    mobile: { left: 6, bottom: 17 },
  },
  '.p-bl-2': {
    desktop: { left: 11, bottom: 0 },
    mobile: { left: 13, bottom: 2 },
  },
  '.p-tr-c2': { desktop: { left: 80, top: 2 }, mobile: { left: 88, top: 3 } },
  '.p-tr-2': { desktop: { left: 82, top: 3 }, mobile: { left: 90, top: 4 } },
  '.p-tr-c1': { desktop: { left: 80, top: 22 }, mobile: { left: 86, top: 22 } },
  '.p-tr-1': { desktop: { left: 75, top: 27 }, mobile: { left: 84, top: 28 } },
  '.p-br-c1': {
    desktop: { left: 80, bottom: 2 },
    mobile: { left: 88, bottom: 3 },
  },
  '.p-br-2': {
    desktop: { left: 85, bottom: 26 },
    mobile: { left: 86, bottom: 27 },
  },
  '.p-br-1': {
    desktop: { left: 75, bottom: 0 },
    mobile: { left: 82, bottom: 2 },
  },
});

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
 * @param {string} value a computed CSS length
 * @param {number} basis the containing size in px
 * @returns {number} the value as a percentage of `basis`
 */
function toPercent(value, basis) {
  if (!value || value === 'auto' || basis === 0) return 0;
  if (value.endsWith('%')) return Number.parseFloat(value);
  if (value.endsWith('px')) return (Number.parseFloat(value) / basis) * 100;
  return 0;
}

/**
 * @typedef {object} Flower
 * @property {HTMLElement} element
 * @property {string} selector
 * @property {boolean} anchorLeft
 * @property {boolean} anchorTop
 * @property {boolean} isCropped
 * @property {number} startX
 * @property {number} startY
 * @property {number} targetX
 * @property {number} targetY
 * @property {{ x: number, y: number, scale: number } | null} lastWrite
 */

/** @param {HTMLElement} element */
function clearInlinePlacement(element) {
  for (const property of ['left', 'right', 'top', 'bottom', 'transform']) {
    element.style.removeProperty(property);
  }
}

/**
 * Measures every flower's CSS-defined starting position and pairs it with its
 * target. Inline styles are stripped first, otherwise a re-measure after a
 * resize would read back the animated position instead of the stylesheet one.
 *
 * @param {Document | HTMLElement} root
 * @returns {Flower[]}
 */
function measureFlowers(root) {
  const breakpoint = isMobile() ? 'mobile' : 'desktop';

  /** @type {Flower[]} */
  const flowers = [];

  for (const [selector, entry] of Object.entries(FLOWERS)) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) continue;

    clearInlinePlacement(element);

    const group = element.closest('.corner-group') ?? element.offsetParent;
    const groupWidth =
      (group instanceof HTMLElement ? group.offsetWidth : 0) ||
      window.innerWidth;
    const groupHeight =
      (group instanceof HTMLElement ? group.offsetHeight : 0) ||
      window.innerHeight;

    // The target's own key decides the vertical anchor. Horizontally both
    // edges are spelled `left` in the table, so that one still comes from the
    // stylesheet.
    const target = entry[breakpoint];
    const anchorTop = 'top' in target;
    const computed = getComputedStyle(element);
    const anchorLeft = computed.left !== 'auto';

    const startX = anchorLeft
      ? toPercent(computed.left, groupWidth)
      : 100 - toPercent(computed.right, groupWidth);
    const startY = anchorTop
      ? toPercent(computed.top, groupHeight)
      : toPercent(computed.bottom, groupHeight);

    flowers.push({
      element,
      selector,
      anchorLeft,
      anchorTop,
      isCropped: element.classList.contains('cropped-flower'),
      startX,
      startY,
      targetX: target.left,
      targetY: anchorTop ? target.top : target.bottom,
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

  let flowers = measureFlowers(root);
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

  // A resize changes the breakpoint, the corner-group size and therefore every
  // measured percentage — remeasure rather than animate from stale numbers.
  const stopViewportWatch = onViewportChange(() => {
    flowers = measureFlowers(root);
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
