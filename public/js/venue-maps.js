/**
 * Embedded Yandex maps for the two venues.
 *
 * Both containers used to have their own near-identical loader built with
 * `innerHTML`; this builds the iframe through the DOM API instead, which keeps
 * venue data out of the HTML parser and lets the CSP stay strict.
 */

const DEFAULT_MAP_SIZE = { width: 580, height: 346 };

/**
 * @param {import('./site-config.js').Venue} venue
 * @param {string} title accessible name for the frame
 * @returns {HTMLIFrameElement}
 */
function createMapFrame(venue, title) {
  const frame = document.createElement('iframe');
  frame.src = venue.yandexMapUrl;
  frame.title = title;
  frame.width = String(venue.mapDimensions?.width ?? DEFAULT_MAP_SIZE.width);
  frame.height = String(venue.mapDimensions?.height ?? DEFAULT_MAP_SIZE.height);
  frame.loading = 'lazy';
  frame.allowFullscreen = true;
  return frame;
}

/**
 * @param {HTMLElement} container
 * @param {string} message
 */
function renderUnavailable(container, message) {
  const note = document.createElement('p');
  note.className = 'map-fallback';
  note.textContent = message;
  container.replaceChildren(note);
}

/**
 * Fills every `[data-venue]` container with its map.
 *
 * The `data-venue` value names a key on the config object, so adding a third
 * venue needs markup and config only — no change here.
 *
 * @param {import('./site-config.js').SiteConfig | null} config
 * @param {Document | HTMLElement} [root]
 */
export function initVenueMaps(config, root = document) {
  const containers = root.querySelectorAll('[data-venue]');

  for (const container of containers) {
    if (!(container instanceof HTMLElement)) continue;

    const key = container.dataset.venue ?? '';
    const venue = config?.[/** @type {'location'} */ (key)];
    const title = container.dataset.venueTitle ?? 'Карта месца правядзення';

    if (!venue || typeof venue.yandexMapUrl !== 'string') {
      renderUnavailable(container, 'Карта часова недаступная.');
      continue;
    }

    container.replaceChildren(createMapFrame(venue, title));
  }
}
