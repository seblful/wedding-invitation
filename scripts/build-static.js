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

const { cacheHeaderBlocks } = require('../src/caching.js');
const { loadContent } = require('../src/config.js');
const {
  ROOT,
  PUBLIC_DIR,
  BUILD_DIR,
  INDEX_TEMPLATE,
  STYLESHEET,
} = require('../src/paths.js');
const { renderIndexHtml } = require('../src/render.js');
const { staticSecurityHeaders } = require('../src/security.js');

/** Source-only files that must not ship to the CDN. */
const EXCLUDED_FROM_BUILD = new Set(['input.css', 'package.json']);

/**
 * Files that name a font. Anything in `public/fonts/` that none of them
 * mentions is an orphan and is left out of the build — `CorrectionBrush.otf`
 * sat in the deployment for months at 332 KB without a single reference.
 *
 * `input.css` rather than the generated stylesheet: the `@font-face` rules are
 * source, and reading the source keeps this independent of the minifier.
 */
const FONT_REFERENCE_SOURCES = ['input.css', 'index.html'];

/**
 * Cloudflare's `_headers` format: a path pattern, then indented header lines.
 *
 * Both policies are rendered here rather than written out: `src/security.js`
 * owns the headers and `src/caching.js` owns the lifetimes, so the edge and
 * the dev server read from the same two tables.
 *
 * @param {import('../src/config.js').SiteContent} content
 * @returns {string}
 */
function renderHeadersFile(content) {
  const blocks = [
    { path: '/*', headers: staticSecurityHeaders(content) },
    ...cacheHeaderBlocks(),
  ];

  const lines = [];
  for (const { path: pattern, headers } of blocks) {
    if (lines.length > 0) lines.push('');
    lines.push(pattern);
    for (const [name, value] of Object.entries(headers)) {
      lines.push(`  ${name}: ${value}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * @returns {Set<string>} basenames of the fonts some source file references
 */
function referencedFonts() {
  const names = new Set();
  for (const source of FONT_REFERENCE_SOURCES) {
    const text = fs.readFileSync(path.join(PUBLIC_DIR, source), 'utf8');
    for (const match of text.matchAll(/[\w %.-]+\.(?:otf|ttf|woff2?)/gi)) {
      names.add(path.basename(match[0]));
    }
  }
  return names;
}

/**
 * @param {string} dir
 * @returns {{ entries: number, skippedFonts: string[] }}
 */
function copyPublicTree(dir) {
  const fonts = referencedFonts();
  const skippedFonts = [];

  fs.cpSync(PUBLIC_DIR, dir, {
    recursive: true,
    filter: (source) => {
      const name = path.basename(source);
      if (EXCLUDED_FROM_BUILD.has(name)) return false;
      if (path.dirname(source).endsWith('fonts') && !fonts.has(name)) {
        skippedFonts.push(name);
        return false;
      }
      return true;
    },
  });

  return {
    entries: fs.readdirSync(dir, { recursive: true }).length,
    skippedFonts,
  };
}

/**
 * The stylesheet is generated and gitignored, so a fresh clone that runs
 * `build:static` on its own would otherwise produce an unstyled site and say
 * nothing about it.
 */
function assertStylesheetBuilt() {
  if (!fs.existsSync(STYLESHEET)) {
    throw new Error(
      `${path.relative(ROOT, STYLESHEET)} is missing — run \`npm run build:css\` ` +
        'first (or `npm run build`, which does both).'
    );
  }
}

function build() {
  console.log('Building static site...');

  // Checked before the content: on a fresh clone the missing stylesheet is
  // the likelier problem and the friendlier message.
  assertStylesheetBuilt();
  const content = loadContent();

  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  const { entries, skippedFonts } = copyPublicTree(BUILD_DIR);
  console.log(`  Copied ${entries} entries from public/`);
  for (const name of skippedFonts) {
    console.log(`  Skipped unreferenced font ${name}`);
  }

  // Read from public/, the same file src/app.js renders, rather than from the
  // copy just made in build/. The byte-identical guarantee then holds because
  // both targets read one template, not because `cpSync` happens to be
  // verbatim.
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  fs.writeFileSync(
    path.join(BUILD_DIR, 'index.html'),
    renderIndexHtml(template, content),
    'utf8'
  );
  console.log('  Rendered index.html');

  fs.writeFileSync(
    path.join(BUILD_DIR, '_headers'),
    renderHeadersFile(content),
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

module.exports = { build, renderHeadersFile, referencedFonts };
