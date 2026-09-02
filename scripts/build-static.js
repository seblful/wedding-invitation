#!/usr/bin/env node
/**
 * Static site generator.
 *
 * Produces `build/` — the exact tree Wrangler uploads. Rendering goes through
 * `src/render.js`, the same module the Express server uses, so the two outputs
 * cannot diverge.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { content } = require('../src/config.js');
const { buildClientConfig, renderIndexHtml } = require('../src/render.js');
const { staticSecurityHeaders } = require('../src/security.js');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BUILD_DIR = path.join(ROOT, 'build');

/** Source-only files that must not ship to the CDN. */
const EXCLUDED_FROM_BUILD = new Set(['input.css', 'package.json']);

/**
 * Cloudflare's `_headers` format: a path pattern, then indented header lines.
 *
 * @returns {string}
 */
function renderHeadersFile() {
  const lines = ['/*'];
  for (const [name, value] of Object.entries(staticSecurityHeaders())) {
    lines.push(`  ${name}: ${value}`);
  }
  lines.push('');
  lines.push('/index.html');
  lines.push('  Cache-Control: no-cache');
  lines.push('');
  return lines.join('\n');
}

/**
 * @param {string} dir
 * @returns {number} number of files written
 */
function copyPublicTree(dir) {
  fs.cpSync(PUBLIC_DIR, dir, {
    recursive: true,
    filter: (source) => !EXCLUDED_FROM_BUILD.has(path.basename(source)),
  });
  return fs.readdirSync(dir, { recursive: true }).length;
}

function build() {
  console.log('Building static site...');

  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  const entries = copyPublicTree(BUILD_DIR);
  console.log(`  Copied ${entries} entries from public/`);

  const indexPath = path.join(BUILD_DIR, 'index.html');
  const template = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, renderIndexHtml(template, content), 'utf8');
  console.log('  Rendered index.html');

  fs.writeFileSync(
    path.join(BUILD_DIR, 'config.json'),
    `${JSON.stringify(buildClientConfig(content), null, 2)}\n`,
    'utf8'
  );
  console.log('  Generated config.json');

  fs.writeFileSync(
    path.join(BUILD_DIR, '_headers'),
    renderHeadersFile(),
    'utf8'
  );
  console.log('  Generated _headers');

  console.log(`Build complete: ${path.relative(ROOT, BUILD_DIR)}/`);
}

if (require.main === module) {
  try {
    build();
  } catch (err) {
    console.error(`Build failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

module.exports = { build, renderHeadersFile, BUILD_DIR };
