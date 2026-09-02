/**
 * Embedded Yandex maps for the two venues.
 *
 * Every value comes off the container the renderer wrote it onto, so the
 * frames go up on first paint. This used to wait on a `/config.json` fetch and
 * render "the map is temporarily unavailable" whenever that failed; the
 * `<noscript>` link behind each container already covers the case where this
 * module never runs at all.
 *
 * The iframe is built through the DOM API rather than `innerHTML`, which keeps
 * venue data out of the HTML parser and lets the CSP stay strict.
 */

/**
 * @param {HTMLElement} container
 * @returns {HTMLIFrameElement}
 */
function createMapFrame(container) {
  const { mapEmbed, mapWidth, mapHeight, mapTitle } = container.dataset;

  const frame = document.createElement('iframe');
  frame.src = mapEmbed ?? '';
  frame.title = mapTitle ?? 'Карта месца правядзення';
  // Intrinsic size, declared in the markup beside the image dimensions, so the
  // browser can reserve the space before the frame loads.
  if (mapWidth) frame.width = mapWidth;
  if (mapHeight) frame.height = mapHeight;
  frame.loading = 'lazy';
  frame.allowFullscreen = true;
  return frame;
}

/**
 * Fills every map container with its frame.
 *
 * A container is one carrying `data-map-embed`, so adding a third venue needs
 * markup and config only — no change here.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {() => void} teardown; removes the frames this put up
 */
export function initVenueMaps(root = document) {
  /** @type {HTMLIFrameElement[]} */
  const frames = [];

  for (const container of root.querySelectorAll('[data-map-embed]')) {
    if (!(container instanceof HTMLElement)) continue;
    const frame = createMapFrame(container);
    frames.push(frame);
    container.replaceChildren(frame);
  }

  // The `<noscript>` fallback this replaced cannot come back, so teardown
  // leaves an empty container rather than pretending to restore it.
  return () => {
    for (const frame of frames) frame.remove();
    frames.length = 0;
  };
}
