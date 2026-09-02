/**
 * Countdown to the ceremony.
 *
 * The target date comes from a `data-wedding-date` attribute rendered into the
 * HTML, so the countdown works even if `/config.json` fails to load.
 */

const UNIT_IDS = /** @type {const} */ (['days', 'hours', 'minutes', 'seconds']);

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Splits a duration into whole days, hours, minutes and seconds.
 * Negative durations clamp to zero — the day of the wedding should read 00.
 *
 * @param {number} remainingMs
 * @returns {Record<typeof UNIT_IDS[number], number>}
 */
export function splitDuration(remainingMs) {
  const ms = Math.max(0, remainingMs);
  return {
    days: Math.floor(ms / MS_PER_DAY),
    hours: Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND),
  };
}

/**
 * Starts the ticking countdown.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} stop function; no-op when the markup is absent
 */
export function initCountdown(root = document) {
  const container = root.querySelector('[data-wedding-date]');
  if (!(container instanceof HTMLElement)) return () => {};

  const targetMs = Date.parse(container.dataset.weddingDate ?? '');
  if (Number.isNaN(targetMs)) {
    console.error('Invalid data-wedding-date:', container.dataset.weddingDate);
    return () => {};
  }

  /** @type {Partial<Record<typeof UNIT_IDS[number], HTMLElement>>} */
  const outputs = {};
  for (const id of UNIT_IDS) {
    const el = root.querySelector(`#${id}`);
    if (el instanceof HTMLElement) outputs[id] = el;
  }

  if (Object.keys(outputs).length === 0) return () => {};

  let timer = 0;

  const tick = () => {
    const remaining = splitDuration(targetMs - Date.now());
    for (const id of UNIT_IDS) {
      const el = outputs[id];
      if (!el) continue;
      const text = String(remaining[id]).padStart(2, '0');
      // Avoid touching the DOM when nothing changed.
      if (el.textContent !== text) el.textContent = text;
    }
    if (targetMs - Date.now() <= 0) stop();
  };

  const stop = () => {
    if (timer !== 0) {
      window.clearInterval(timer);
      timer = 0;
    }
  };

  tick();
  timer = window.setInterval(tick, MS_PER_SECOND);
  window.addEventListener('pagehide', stop, { once: true });

  return stop;
}
