/**
 * Express application factory.
 *
 * Exported without calling `listen()` so tests can drive it over an ephemeral
 * port; `src/server.js` owns the process lifecycle.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const compression = require('compression');
const express = require('express');
const helmet = require('helmet');

const { cacheControlFor } = require('./caching.js');
const { loadContent } = require('./config.js');
const { renderIndexHtml } = require('./render.js');
const {
  contentSecurityPolicy,
  REFERRER_POLICY,
  FRAME_OPTIONS,
} = require('./security.js');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const INDEX_TEMPLATE = path.join(PUBLIC_DIR, 'index.html');

/**
 * @param {object} [options]
 * @param {import('./config.js').SiteContent} [options.content] The wedding
 *   content to render. Defaults to the shipped `config.js`; a test can hand in
 *   its own without going through the environment.
 * @param {boolean} [options.cacheHtml] Render once at boot (production) instead
 *   of on every request (development, so template edits show up on reload).
 * @param {boolean} [options.requestLogging]
 * @returns {import('express').Express}
 */
function createApp({
  content = loadContent(),
  cacheHtml = true,
  requestLogging = true,
} = {}) {
  const app = express();

  /** @returns {string} */
  function renderPage() {
    return renderIndexHtml(fs.readFileSync(INDEX_TEMPLATE, 'utf8'), content);
  }

  // Rendering at boot turns a template error into a failed start rather than a
  // 500 on the first visitor, and avoids a synchronous read per request.
  const bootHtml = renderPage();

  /** @returns {string} */
  const pageHtml = () => (cacheHtml ? bootHtml : renderPage());

  app.disable('x-powered-by');
  app.set('etag', 'strong');

  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: { directives: contentSecurityPolicy() },
      referrerPolicy: { policy: REFERRER_POLICY },
      frameguard: { action: FRAME_OPTIONS.toLowerCase() },
      // The page is served over plain HTTP in local dev; HSTS is set at the
      // edge in production (see the generated build/_headers).
      strictTransportSecurity: false,
      // Would block the Yandex map iframes, which send no CORP header.
      crossOriginEmbedderPolicy: false,
    })
  );

  if (requestLogging) {
    app.use((req, res, next) => {
      const startedAt = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
        console.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`
        );
      });
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.get('/', (_req, res) => {
    // `/` is a route, not a file, so express.static never gets to apply the
    // policy to the one URL every guest actually requests.
    res
      .type('html')
      .set('Cache-Control', cacheControlFor('/') ?? '')
      .send(pageHtml());
  });

  // Without this, express.static would hand out the raw template complete with
  // visible `PAGE_TITLE_PLACEHOLDER` text.
  app.get('/index.html', (_req, res) => {
    res.redirect(301, '/');
  });

  app.use(
    express.static(PUBLIC_DIR, {
      // No directory index: `/` and `/index.html` are handled above so the
      // unrendered template can never be served.
      index: false,
      setHeaders: (res, filePath) => {
        // The same table build/_headers is generated from, so the dev server
        // and the edge cannot disagree about a lifetime.
        const sitePath = `/${path
          .relative(PUBLIC_DIR, filePath)
          .split(path.sep)
          .join('/')}`;
        const cacheControl = cacheControlFor(sitePath);
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
      },
    })
  );

  app.use((req, res) => {
    if (req.accepts('html')) {
      res.status(404).type('html').send(pageHtml());
      return;
    }
    res.status(404).json({ error: 'Not found' });
  });

  // Express identifies error middleware by arity, so the fourth parameter has
  // to stay in the signature even though it is never called.
  app.use((err, _req, res, _next) => {
    console.error('Unhandled request error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp, PUBLIC_DIR, INDEX_TEMPLATE };
