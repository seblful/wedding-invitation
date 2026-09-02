/**
 * Shared HTML rendering.
 *
 * The Express server and the static site generator both go through this module,
 * so `npm run dev` and `npm run build` emit byte-identical markup. Previously
 * each had its own copy of the templating logic and they had already drifted
 * (different form actions, a placeholder that no longer existed).
 */

'use strict';

const { customProperties, themeColor } = require('../palette.js');

const HTML_ESCAPES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

/**
 * Escapes a value for interpolation into HTML text or a double-quoted
 * attribute. Config is trusted-ish, but an apostrophe in a Belarusian name is
 * exactly the sort of thing that silently breaks an attribute.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Joins an origin and a site-root-relative path into an absolute URL.
 *
 * @param {string} baseUrl
 * @param {string} pathname
 * @returns {string}
 */
function absoluteUrl(baseUrl, pathname) {
  const origin = baseUrl.replace(/\/+$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

/**
 * @param {import('./config.js').SiteContent} content
 * @returns {string} Open Graph and Twitter card meta tags
 */
/** Indentation of the placeholder comments in public/index.html. */
const HEAD_INDENT = '    ';

function buildSocialTags(content) {
  const canonicalUrl = `${content.baseUrl.replace(/\/+$/, '')}/`;
  const imageUrl = absoluteUrl(content.baseUrl, content.openGraph.image);
  const { title, description } = content.openGraph;

  return [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    // Without this the card image is unlabelled everywhere the link is shared.
    `<meta property="og:image:alt" content="${escapeHtml(title)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="be_BY" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
  ].join(`\n${HEAD_INDENT}`);
}

/** A `<style>` block is the one place a palette value has to be safe as-is. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Emits the palette as CSS custom properties, so `palette.js` genuinely drives
 * the page colours instead of them being duplicated in `custom.css`.
 *
 * Values are checked rather than escaped: HTML entities do not decode inside a
 * `<style>` element, so `escapeHtml` would corrupt a value here rather than
 * neutralise it. A palette entry that is not a plain hex colour fails the
 * render instead.
 *
 * @param {Record<string, string>} [properties] defaults to the palette
 * @returns {string}
 * @throws {TemplateError} when a value is not a hex colour
 */
function buildThemeVars(properties = customProperties) {
  // The first line lands at the placeholder's own indentation; the rest carry
  // theirs explicitly so the emitted HTML stays readable.
  const lines = ['<style>', `${HEAD_INDENT}  :root {`];

  for (const [property, value] of Object.entries(properties)) {
    if (!HEX_COLOR.test(value)) {
      throw new TemplateError(
        `${property} is ${JSON.stringify(value)}, which is not a hex colour ` +
          'and cannot be written into a <style> block.'
      );
    }
    lines.push(`${HEAD_INDENT}    ${property}: ${value};`);
  }

  lines.push(`${HEAD_INDENT}  }`, `${HEAD_INDENT}</style>`);
  return lines.join('\n');
}

/**
 * Where a "open this in Yandex Maps" link should point for a venue.
 *
 * @param {import('./config.js').Venue} venue
 * @returns {string}
 */
function venueMapLink(venue) {
  return venue.yandexDirectUrl ?? venue.yandexMapUrl;
}

/**
 * @param {import('./config.js').SiteContent} content
 * @returns {Record<string, string>} placeholder token -> replacement
 */
function buildReplacements(content) {
  return {
    '<!-- OPENGRAPH_PLACEHOLDER -->': buildSocialTags(content),
    '<!-- THEME_VARS_PLACEHOLDER -->': buildThemeVars(),
    CANONICAL_URL_PLACEHOLDER: escapeHtml(
      `${content.baseUrl.replace(/\/+$/, '')}/`
    ),
    THEME_COLOR_PLACEHOLDER: escapeHtml(themeColor),
    // Rendered into a data attribute so the countdown does not depend on the
    // /config.json round-trip.
    WEDDING_DATE_PLACEHOLDER: escapeHtml(
      new Date(content.weddingDate).toISOString()
    ),
    PAGE_TITLE_PLACEHOLDER: escapeHtml(content.openGraph.title),
    PAGE_DESCRIPTION_PLACEHOLDER: escapeHtml(content.openGraph.description),
    FORM_DEADLINE_PLACEHOLDER: escapeHtml(content.form.deadline),
    FORM_ACTION_PLACEHOLDER: escapeHtml(content.form.formspreeEndpoint),
    // Targets for the <noscript> links behind each map embed. The direct link
    // is the nicer destination; the widget URL is a usable map on its own when
    // a venue has no direct link.
    VENUE_MAP_URL_PLACEHOLDER: escapeHtml(venueMapLink(content.location)),
    SECOND_DAY_MAP_URL_PLACEHOLDER: escapeHtml(
      venueMapLink(content.secondDayLocation)
    ),
    // The widget URL js/venue-maps.js builds each iframe from. Rendered onto
    // the container rather than fetched: the frames go up on first paint, and
    // there is no /config.json round-trip to fail.
    VENUE_MAP_EMBED_PLACEHOLDER: escapeHtml(content.location.yandexMapUrl),
    SECOND_DAY_MAP_EMBED_PLACEHOLDER: escapeHtml(
      content.secondDayLocation.yandexMapUrl
    ),
  };
}

/** Matches any leftover token, so a renamed placeholder cannot fail silently. */
const LEFTOVER_PLACEHOLDER = /[A-Z][A-Z0-9_]*_PLACEHOLDER/g;

class TemplateError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'TemplateError';
  }
}

/**
 * Substitutes every placeholder in the index template.
 *
 * Throws if a token survives substitution — that is how
 * `BACKGROUND_COLOR_PLACEHOLDER` used to rot: the replacement existed in code
 * but the token had been deleted from the HTML, so nobody noticed.
 *
 * @param {string} template raw `public/index.html`
 * @param {import('./config.js').SiteContent} content
 * @returns {string} render-ready HTML
 * @throws {TemplateError} when a placeholder is unknown or unused
 */
function renderIndexHtml(template, content) {
  const replacements = buildReplacements(content);

  let html = template;
  const unused = [];

  for (const [token, value] of Object.entries(replacements)) {
    if (!html.includes(token)) {
      unused.push(token);
      continue;
    }
    html = html.split(token).join(value);
  }

  if (unused.length > 0) {
    throw new TemplateError(
      `Template has no slot for: ${unused.join(', ')}. ` +
        'Either add the placeholder to public/index.html or drop it from src/render.js.'
    );
  }

  const leftover = html.match(LEFTOVER_PLACEHOLDER);
  if (leftover) {
    throw new TemplateError(
      `Unsubstituted placeholder(s) in rendered HTML: ${[...new Set(leftover)].join(', ')}`
    );
  }

  return html;
}

module.exports = {
  escapeHtml,
  absoluteUrl,
  buildSocialTags,
  buildThemeVars,
  buildReplacements,
  renderIndexHtml,
  TemplateError,
};
