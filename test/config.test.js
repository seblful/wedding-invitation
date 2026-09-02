'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  content,
  ConfigError,
  validate,
  findProblems,
  applyEnvOverrides,
  loadServerConfig,
} = require('../src/config.js');

/** A minimal well-formed content object for mutation in individual tests. */
function validContent() {
  return {
    baseUrl: 'https://example.test',
    themeColor: '#fdf4e3',
    backgroundColor: '#b9dfc6',
    openGraph: { title: 'T', description: 'D', image: 'images/preview.png' },
    weddingDate: '2026-08-02T12:00:00.000Z',
    timezone: 'Europe/Minsk',
    location: {
      name: 'Venue',
      address: 'Street 1',
      yandexMapUrl: 'https://yandex.ru/map-widget/v1/?ll=0,0',
      mapDimensions: { width: 580, height: 346 },
    },
    secondDayLocation: {
      name: 'Venue 2',
      address: 'Street 2',
      yandexMapUrl: 'https://yandex.ru/map-widget/v1/?ll=1,1',
      mapDimensions: { width: 580, height: 346 },
    },
    form: {
      deadline: '30 June 2026',
      formspreeEndpoint: 'https://formspree.io/f/test',
    },
  };
}

describe('the shipped config.js', () => {
  it('is valid', () => {
    assert.deepEqual(findProblems(content), []);
  });

  it('is deeply frozen so handlers cannot mutate shared state', () => {
    assert.throws(() => {
      content.form.formspreeEndpoint = 'https://evil.test';
    }, TypeError);
  });

  it('no longer carries the removed api.submitFormEndpoint block', () => {
    assert.equal(
      'api' in content,
      false,
      'the Express form proxy was removed; config.api should be gone too'
    );
  });
});

describe('findProblems', () => {
  it('accepts a well-formed object', () => {
    assert.deepEqual(findProblems(validContent()), []);
  });

  it('reports every problem at once rather than only the first', () => {
    const broken = validContent();
    broken.baseUrl = 'not-a-url';
    broken.themeColor = 'burgundy';
    delete broken.form.deadline;

    const problems = findProblems(broken);
    assert.equal(problems.length, 3);
    assert.ok(problems.some((p) => p.startsWith('baseUrl')));
    assert.ok(problems.some((p) => p.startsWith('themeColor')));
    assert.ok(problems.some((p) => p.startsWith('form.deadline')));
  });

  it('rejects a non-http protocol', () => {
    const broken = validContent();
    broken.location.yandexMapUrl = 'javascript:alert(1)';
    assert.equal(findProblems(broken).length, 1);
  });

  it('rejects an unparseable wedding date', () => {
    const broken = validContent();
    broken.weddingDate = 'next summer';
    assert.match(findProblems(broken)[0], /^weddingDate/);
  });

  it('rejects non-positive map dimensions', () => {
    const broken = validContent();
    broken.location.mapDimensions.width = 0;
    assert.match(findProblems(broken)[0], /^location\.mapDimensions\.width/);
  });

  it('does not throw when whole branches are missing', () => {
    assert.ok(findProblems({}).length > 0);
    assert.ok(findProblems(null).length > 0);
  });
});

describe('validate', () => {
  it('returns the object it was given when valid', () => {
    const input = validContent();
    assert.equal(validate(input), input);
  });

  it('throws a ConfigError listing the problems', () => {
    assert.throws(
      () => validate({}),
      (error) => {
        assert.ok(error instanceof ConfigError);
        assert.ok(error.problems.length > 0);
        assert.match(error.message, /Invalid configuration/);
        return true;
      }
    );
  });
});

describe('applyEnvOverrides', () => {
  it('leaves content untouched with an empty environment', () => {
    const input = validContent();
    assert.deepEqual(applyEnvOverrides(input, {}), input);
  });

  it('overrides the base URL and Formspree endpoint', () => {
    const result = applyEnvOverrides(validContent(), {
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
    const input = validContent();
    applyEnvOverrides(input, { BASE_URL: 'https://staging.test' });
    assert.equal(input.baseUrl, 'https://example.test');
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
