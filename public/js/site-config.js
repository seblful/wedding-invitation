/**
 * Runtime configuration fetched from `/config.json`.
 *
 * The file is generated from `config.js` by the server and the static build,
 * so it is always in sync with the rendered HTML.
 */

const CONFIG_URL = '/config.json';

/**
 * @typedef {object} Venue
 * @property {string} name
 * @property {string} address
 * @property {string} yandexMapUrl
 * @property {string} [yandexDirectUrl]
 * @property {{ width: number, height: number }} [mapDimensions]
 */

/**
 * @typedef {object} SiteConfig
 * @property {string} weddingDate
 * @property {string} timezone
 * @property {Venue} location
 * @property {Venue} secondDayLocation
 * @property {string} formspreeEndpoint
 */

/**
 * Loads the runtime config.
 *
 * Resolves to `null` rather than throwing: the countdown reads its date from a
 * data attribute in the HTML, so a failed fetch should degrade the maps only,
 * not take down the page.
 *
 * @returns {Promise<SiteConfig | null>}
 */
export async function loadSiteConfig() {
  try {
    const response = await fetch(CONFIG_URL, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return /** @type {SiteConfig} */ (await response.json());
  } catch (error) {
    console.error(`Could not load ${CONFIG_URL}:`, error);
    return null;
  }
}
