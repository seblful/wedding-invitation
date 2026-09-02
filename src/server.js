/**
 * Process entry point: boot the app, listen, shut down cleanly.
 */

'use strict';

const { createApp } = require('./app.js');
const { server: serverConfig } = require('./config.js');

/** Give in-flight requests a chance to finish before forcing exit. */
const SHUTDOWN_GRACE_MS = 10_000;

function main() {
  const isProduction = serverConfig.nodeEnv === 'production';
  const app = createApp({ cacheHtml: isProduction });

  const server = app.listen(serverConfig.port, serverConfig.host, () => {
    const { port } = /** @type {import('node:net').AddressInfo} */ (
      server.address()
    );
    console.log(
      `[${serverConfig.nodeEnv}] listening on http://localhost:${port}`
    );
  });

  server.on('error', (err) => {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EADDRINUSE') {
      console.error(
        `Port ${serverConfig.port} is already in use. Set PORT to choose another.`
      );
    } else {
      console.error('Server error:', err);
    }
    process.exitCode = 1;
  });

  let shuttingDown = false;

  /** @param {NodeJS.Signals} signal */
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, closing server...`);

    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out, exiting.');
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    forceExit.unref();

    server.close((err) => {
      if (err) {
        console.error('Error during shutdown:', err);
        process.exitCode = 1;
      }
      clearTimeout(forceExit);
    });
  }

  for (const signal of /** @type {NodeJS.Signals[]} */ ([
    'SIGINT',
    'SIGTERM',
  ])) {
    process.on(signal, () => shutdown(signal));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

module.exports = { main };
