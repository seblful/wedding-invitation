/**
 * Configuration loader and validator.
 *
 * `loadContent()` reads the wedding content from `config.js`, applies
 * environment overrides, validates the result and freezes it. Anything
 * malformed throws a `ConfigError` listing every problem at once.
 *
 * Loading is a call rather than something that happens on import. When it was
 * an import side effect, nothing could be tested against content other than
 * the shipped file — `test/config.test.js` kept a hand-written copy of
 * `config.js` for that — and a `ConfigError` was thrown while `src/server.js`
 * was still being required, so the friendly one-line message it prints for one
 * was unreachable and a bad `PORT` produced a stack trace instead.
 */

'use strict';

const siteContent = require('../config.js');

/**
 * @typedef {object} Venue
 * @property {string} name
 * @property {string[]} address one entry per rendered line
 * @property {string} yandexMapUrl the embeddable map-widget URL
 * @property {string} [yandexDirectUrl] nicer destination for a plain link
 */

/**
 * @typedef {object} SiteContent
 * @property {string} baseUrl
 * @property {{ title: string, description: string, image: string }} openGraph
 * @property {string} weddingDate ISO 8601 timestamp
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
  const isLines = (v) =>
    Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString);
  const isHttpUrl = (v) => {
    if (typeof v !== 'string') return false;
    try {
      return ['http:', 'https:'].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  };

  check('baseUrl', isHttpUrl, 'must be an http(s) URL');

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

  for (const venue of ['location', 'secondDayLocation']) {
    check(`${venue}.name`, isNonEmptyString, 'must be a non-empty string');
    check(
      `${venue}.address`,
      isLines,
      'must be an array of non-empty address lines'
    );
    check(`${venue}.yandexMapUrl`, isHttpUrl, 'must be an http(s) URL');
  }

  check('form.deadline', isNonEmptyString, 'must be a non-empty string');
  check('form.formspreeEndpoint', isHttpUrl, 'must be an http(s) URL');

  return problems;
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
  const merged = { ...content, form: { ...content?.form } };

  if (env.BASE_URL) merged.baseUrl = env.BASE_URL;
  if (env.FORMSPREE_ENDPOINT) {
    merged.form.formspreeEndpoint = env.FORMSPREE_ENDPOINT;
  }

  return merged;
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

/**
 * The validated, frozen wedding content.
 *
 * @param {unknown} [source] defaults to the shipped `config.js`
 * @param {NodeJS.ProcessEnv} [env] defaults to `process.env`
 * @returns {Readonly<SiteContent>}
 * @throws {ConfigError} listing every problem, when anything is malformed
 */
function loadContent(source = siteContent, env = process.env) {
  const merged = applyEnvOverrides(
    /** @type {SiteContent} */ (source ?? {}),
    env
  );

  const problems = findProblems(merged);
  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return deepFreeze(/** @type {SiteContent} */ (merged));
}

/**
 * @param {NodeJS.ProcessEnv} [env] defaults to `process.env`
 * @returns {{ port: number, host: string, nodeEnv: string }}
 * @throws {ConfigError} when PORT is not a port number
 */
function loadServerConfig(env = process.env) {
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

module.exports = { loadContent, loadServerConfig, ConfigError };
