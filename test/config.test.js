'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
  loadContent,
  loadServerConfig,
  ConfigError,
} = require('../src/config.js');

/**
 * A well-formed content object, derived from the shipped one so it cannot
 * drift from it. This used to be twenty-eight hand-written lines duplicating
 * `config.js`, because loading was an import side effect and there was no way
 * to hand the loader anything else.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {Record<string, any>}
 */
function content(overrides = {}) {
  return { ...structuredClone(loadContent()), ...overrides };
}

/**
 * The problems `loadContent` rejects a source with.
 *
 * @param {unknown} source
 * @returns {string[]}
 */
function problemsFor(source) {
  try {
    loadContent(source, {});
    return [];
  } catch (error) {
    assert.ok(error instanceof ConfigError, `not a ConfigError: ${error}`);
    return error.problems;
  }
}

describe('the shipped config.js', () => {
  it('is valid', () => {
    assert.deepEqual(problemsFor(undefined), []);
  });

  it('is deeply frozen so handlers cannot mutate shared state', () => {
    const loaded = loadContent();
    assert.throws(() => {
      loaded.form.formspreeEndpoint = 'https://evil.test';
    }, TypeError);
  });

  it('no longer carries the removed api.submitFormEndpoint block', () => {
    assert.equal(
      'api' in loadContent(),
      false,
      'the Express form proxy was removed; config.api should be gone too'
    );
  });

  it('holds no colour — palette.js owns those', () => {
    // They were a third copy of values tailwind.config.js and custom.css also
    // spelled out, and only one of the three had a test following it.
    const loaded = loadContent();
    for (const key of ['themeColor', 'backgroundColor']) {
      assert.equal(key in loaded, false, `config.js still carries ${key}`);
    }
  });

  it('holds no map dimensions — the markup owns those', () => {
    for (const venue of ['location', 'secondDayLocation']) {
      assert.equal('mapDimensions' in loadContent()[venue], false, venue);
    }
  });
});

describe('loadContent validation', () => {
  it('accepts a well-formed object', () => {
    assert.deepEqual(problemsFor(content()), []);
  });

  it('reports every problem at once rather than only the first', () => {
    const broken = content({ baseUrl: 'not-a-url' });
    broken.location = { ...broken.location, yandexMapUrl: 'javascript:x' };
    delete broken.form.deadline;

    const problems = problemsFor(broken);
    assert.equal(problems.length, 3);
    assert.ok(problems.some((p) => p.startsWith('baseUrl')));
    assert.ok(problems.some((p) => p.startsWith('location.yandexMapUrl')));
    assert.ok(problems.some((p) => p.startsWith('form.deadline')));
  });

  it('rejects a non-http protocol', () => {
    const broken = content();
    broken.location.yandexMapUrl = 'javascript:alert(1)';
    assert.equal(problemsFor(broken).length, 1);
  });

  it('rejects an unparseable wedding date', () => {
    assert.match(
      problemsFor(content({ weddingDate: 'next summer' }))[0],
      /^weddingDate/
    );
  });

  it('does not throw when whole branches are missing', () => {
    assert.ok(problemsFor({}).length > 0);
    assert.ok(problemsFor(null).length > 0);
  });

  it('names the file in the message so a boot failure is actionable', () => {
    assert.throws(() => loadContent({}, {}), /Invalid configuration/);
  });
});

describe('loadContent environment overrides', () => {
  it('leaves content untouched with an empty environment', () => {
    const input = content();
    assert.deepEqual(loadContent(input, {}), input);
  });

  it('overrides the base URL and Formspree endpoint', () => {
    const result = loadContent(content(), {
      BASE_URL: 'https://staging.test',
      FORMSPREE_ENDPOINT: 'https://formspree.io/f/staging',
    });
    assert.equal(result.baseUrl, 'https://staging.test');
    assert.equal(
      result.form.formspreeEndpoint,
      'https://formspree.io/f/staging'
    );
  });

  it('does not mutate the source object', () => {
    const input = content({ baseUrl: 'https://example.test' });
    loadContent(input, { BASE_URL: 'https://staging.test' });
    assert.equal(input.baseUrl, 'https://example.test');
  });

  it('validates the override, not just the file', () => {
    assert.throws(
      () => loadContent(content(), { BASE_URL: 'not-a-url' }),
      ConfigError
    );
  });
});

describe('loadServerConfig', () => {
  it('defaults to port 3000 in development', () => {
    assert.deepEqual(loadServerConfig({}), {
      port: 3000,
      host: '0.0.0.0',
      nodeEnv: 'development',
    });
  });

  it('reads PORT, HOST and NODE_ENV', () => {
    assert.deepEqual(
      loadServerConfig({
        PORT: '8080',
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
      }),
      { port: 8080, host: '127.0.0.1', nodeEnv: 'production' }
    );
  });

  it('rejects a PORT that is not a valid port number', () => {
    assert.throws(() => loadServerConfig({ PORT: 'http' }), ConfigError);
    assert.throws(() => loadServerConfig({ PORT: '70000' }), ConfigError);
  });
});

describe('a bad configuration at boot', () => {
  it('reports one readable line instead of a stack trace', () => {
    // The ConfigError used to be thrown while src/server.js was still being
    // required, so the try/catch around main() never saw it and Node printed
    // the whole stack.
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, '..', 'src', 'server.js')],
      { env: { ...process.env, PORT: 'http' }, encoding: 'utf8' }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /PORT must be a valid port number/);
    assert.ok(
      !result.stderr.includes('    at '),
      `printed a stack trace:\n${result.stderr}`
    );
  });
});
