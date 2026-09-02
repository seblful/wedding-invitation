/**
 * Falling petal decoration.
 *
 * Three things the original version got wrong and this one does not: it never
 * stopped (petals kept spawning in background tabs), the spawn rate was fixed
 * at page load so it never adapted to a resize, and it ignored
 * `prefers-reduced-motion`.
 *
 * Petals go into `.petal-field`, a declared layer in the markup, rather than
 * straight onto `document.body`. That one `append` was the reason this module
 * took no `root` and could not be reached from a test at all — and the layer
 * is where `--z-petal` belongs, since a petal only has to stack against its
 * siblings.
 */

import { isMobile, prefersReducedMotion } from './environment.js';

const PETAL_COLORS = Object.freeze([
  '#ffb7c5',
  '#ffc0cb',
  '#ffd1dc',
  '#ffe4e1',
  '#fff0f5',
]);

/** Spawn interval, ms. Mobile gets fewer petals to keep scrolling smooth. */
const SPAWN_INTERVAL_MS = Object.freeze({ mobile: 1000, desktop: 400 });

/** Hard ceiling on live petals, so a long visit cannot pile up DOM nodes. */
const MAX_LIVE_PETALS = 40;

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** @template T @param {readonly T[]} items @returns {T} */
function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * @param {boolean} compact
 * @returns {HTMLDivElement}
 */
function createPetal(compact) {
  const petal = document.createElement('div');
  petal.classList.add('petal');

  const size = compact ? randomBetween(8, 16) : randomBetween(12, 25);
  const duration = compact ? randomBetween(10, 20) : randomBetween(6, 12);
  const delay = randomBetween(0, compact ? 4 : 2);

  petal.style.cssText = `
    left: ${randomBetween(0, 100)}vw;
    width: ${size}px;
    height: ${size}px;
    background: ${randomItem(PETAL_COLORS)};
    transform: rotate(${randomBetween(0, 360)}deg);
    animation: fall ${duration}s linear ${delay}s forwards;
    --fall-distance: ${window.innerHeight + 50}px;
  `;

  // Removing on animationend beats a setTimeout guess, and still fires if the
  // animation is cut short.
  petal.addEventListener('animationend', () => petal.remove(), { once: true });
  return petal;
}

/**
 * Starts the petal fall.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown
 */
export function initFallingPetals(root = document) {
  // Before the reduced-motion probe, which needs `window`: an empty root has
  // to return without touching it, or this module cannot be tested in node.
  const field = root.querySelector('.petal-field');
  if (!(field instanceof HTMLElement)) return () => {};

  if (prefersReducedMotion()) return () => {};

  /** @type {Set<HTMLElement>} */
  const live = new Set();
  let timer = 0;

  const spawn = () => {
    for (const petal of live) {
      if (!petal.isConnected) live.delete(petal);
    }
    if (live.size >= MAX_LIVE_PETALS) return;

    const petal = createPetal(isMobile());
    live.add(petal);
    field.append(petal);
  };

  const stop = () => {
    if (timer !== 0) {
      window.clearInterval(timer);
      timer = 0;
    }
  };

  const start = () => {
    stop();
    const interval = isMobile()
      ? SPAWN_INTERVAL_MS.mobile
      : SPAWN_INTERVAL_MS.desktop;
    timer = window.setInterval(spawn, interval);
  };

  // Pause entirely while the tab is hidden; resume at the rate that suits the
  // viewport we come back to.
  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else start();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stop);
  start();

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', stop);
    stop();
    for (const petal of live) petal.remove();
    live.clear();
  };
}
