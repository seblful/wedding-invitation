/**
 * Entry point. The one module that touches the DOM at import time.
 *
 * The wiring itself lives in `page.js` so it can be driven from a test with a
 * fake root; this file exists to call it on the live document. A test asserts
 * that every other module's top level is side-effect free, and this one is
 * exempt because bootstrapping the page is its whole job.
 */

import { startPage } from './page.js';

/**
 * A `<script type="module">` is deferred, so the document is already parsed
 * by the time this runs and `readyState` is never `'loading'`. The check costs
 * nothing and keeps the bootstrap correct if the tag ever loses `type`.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startPage(), {
    once: true,
  });
} else {
  startPage();
}
