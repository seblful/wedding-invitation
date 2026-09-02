/**
 * ESLint flat config.
 *
 * Node and browser code get separate environments. The previous `.eslintrc.js`
 * enabled both globally, so a `window` reference in server code or a `require`
 * in browser code passed lint and failed at runtime.
 */

'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

/** Rules applied everywhere, on top of eslint:recommended. */
const sharedRules = {
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'smart'],
  'no-implicit-coercion': 'warn',
  'object-shorthand': 'warn',
  curly: ['error', 'multi-line'],
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'public/styles.css',
      'data/**',
      '.wrangler/**',
    ],
  },

  js.configs.recommended,

  // Node: server, build scripts, tooling config.
  {
    // `*.js` is root-level only — every file there is CommonJS (config.js,
    // palette.js, the tooling configs). Listing them one by one meant a new
    // root module linted as neither Node nor browser and failed on `module`.
    files: ['src/**/*.js', 'scripts/**/*.js', 'test/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },

  // Browser: ES modules loaded via <script type="module">.
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      ...sharedRules,
      // Browser code has no logger; console is the only channel.
      'no-console': 'off',
    },
  },

  // Tests may use the node:test globals.
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Must stay last: turns off everything Prettier already handles.
  prettier,
];
