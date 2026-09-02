/**
 * Configuration loader and validator.
 *
 * Reads the wedding content from `config.js`, applies environment overrides,
 * validates the result and freezes it. Anything malformed throws here, at boot,
 * instead of rendering a page with `undefined` in it.
 */

'use strict';

const siteContent = require('../config.js');

/**
 * @typedef {object} MapDimensions
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} Venue
 * @property {string} name
 * @property {string} address
 * @property {string} yandexMapUrl
 * @property {string} [yandexDirectUrl]
 * @property {MapDimensions} mapDimensions
 */

/**
 * @typedef {object} SiteContent
 * @property {string} baseUrl
 * @property {string} themeColor
 * @property {string} backgroundColor
 * @property {{ title: string, description: string, image: string }} openGraph
 * @property {string} weddingDate ISO 8601 timestamp
 * @property {string} timezone
 * @property {Venue} location
 * @property {Venue} secondDayLocation
 * @property {{ deadline: string, formspreeEndpoint: string }} form
 */

class ConfigError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(
      `Invalid configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`
    );
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Reads a dotted path out of an object without throwing on missing parents.
 * @param {unknown} source
 * @param {string} dottedPath
 * @returns {unknown}
 */
function read(source, dottedPath) {
  return dottedPath
    .split('.')
    .reduce(
      (node, key) =>
        node !== null && typeof node === 'object' ? node[key] : undefined,
      source
    );
}

/**
 * Collects every problem with the content object rather than failing on the
 * first one, so a single boot surfaces the whole list.
 *
 * @param {unknown} content
 * @returns {string[]} human-readable problems; empty when valid
 */
function findProblems(content) {
  const problems = [];

  /** @param {string} path @param {(value: unknown) => boolean} predicate @param {string} expectation */
  const check = (path, predicate, expectation) => {
    const value = read(content, path);
    if (!predicate(value)) {
      problems.push(`${path} ${expectation} (got ${JSON.stringify(value)})`);
    }
  };

  const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
  const isHttpUrl = (v) => {
    if (typeof v !== 'string') return false;
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  };
  const isPositiveInt = (v) => Number.isInteger(v) && v > 0;

  check('baseUrl', isHttpUrl, 'must be an http(s) URL');
  check('themeColor', (v) => HEX_COLOR.test(String(v)), 'must be a hex colour');
  check(
    'backgroundColor',
    (v) => HEX_COLOR.test(String(v)),
    'must be a hex colour'
  );

  check('openGraph.title', isNonEmptyString, 'must be a non-empty string');
  check(
    'openGraph.description',
    isNonEmptyString,
    'must be a non-empty string'
  );
  check('openGraph.image', isNonEmptyString, 'must be a non-empty string');

  check(
    'weddingDate',
    (v) => isNonEmptyString(v) && !Number.isNaN(Date.parse(String(v))),
    'must be an ISO 8601 timestamp'
  );
  check('timezone', isNonEmptyString, 'must be an IANA timezone name');

  for (const venue of ['location', 'secondDayLocation']) {
    check(`${venue}.name`, isNonEmptyString, 'must be a non-empty string');
    check(`${venue}.address`, isNonEmptyString, 'must be a non-empty string');
    check(`${venue}.yandexMapUrl`, isHttpUrl, 'must be an http(s) URL');
    check(
      `${venue}.mapDimensions.width`,
      isPositiveInt,
      'must be a positive integer'
    );
    check(
      `${venue}.mapDimensions.height`,
      isPositiveInt,
      'must be a positive integer'
    );
  }

  check('form.deadline', isNonEmptyString, 'must be a non-empty string');
  check('form.formspreeEndpoint', isHttpUrl, 'must be an http(s) URL');

  return problems;
}

/**
 * @param {unknown} content
 * @returns {SiteContent} the same object, proven well-formed
 * @throws {ConfigError} when anything is missing or malformed
 */
function validate(content) {
  const problems = findProblems(content);
  if (problems.length > 0) {
    throw new ConfigError(problems);
  }
  return /** @type {SiteContent} */ (content);
}

/**
 * Environment overrides let the same build run against a staging origin or a
 * throwaway Formspree form without editing tracked files.
 *
 * @param {SiteContent} content
 * @param {NodeJS.ProcessEnv} env
 * @returns {SiteContent}
 */
function applyEnvOverrides(content, env) {
  const merged = { ...content, form: { ...content.form } };

  if (env.BASE_URL) merged.baseUrl = env.BASE_URL;
  if (env.FORMSPREE_ENDPOINT) {
    merged.form.formspreeEndpoint = env.FORMSPREE_ENDPOINT;
  }

  return merged;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ port: number, host: string, nodeEnv: string }}
 */
function loadServerConfig(env) {
  const port = Number.parseInt(env.PORT ?? '3000', 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new ConfigError([
      `PORT must be a valid port number (got ${env.PORT})`,
    ]);
  }

  return {
    port,
    host: env.HOST ?? '0.0.0.0',
    nodeEnv: env.NODE_ENV ?? 'development',
  };
}

/**
 * Deep-freezes the content so a stray handler cannot mutate shared config.
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return Object.freeze(value);
}

const content = deepFreeze(
  validate(applyEnvOverrides(siteContent, process.env))
);

module.exports = {
  /** Validated, frozen wedding content. */
  content,
  /** Server-only settings, read from the environment. */
  server: loadServerConfig(process.env),
  // Exported for tests.
  ConfigError,
  validate,
  findProblems,
  applyEnvOverrides,
  loadServerConfig,
};
