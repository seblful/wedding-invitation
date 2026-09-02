# Wedding Invitation

Belarusian wedding invitation site — a single scrolling page with a countdown,
venue maps, dress-code palette and an RSVP form.

Built with Express (development), Tailwind CSS, and a static build deployed to
Cloudflare Workers.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. `npm run dev` runs the Tailwind watcher and a
`nodemon` server side by side, so editing `config.js`, `public/index.html` or
anything under `src/` shows up on reload.

Requires Node 20.11+ (see `.nvmrc`).

## Editing the content

**Everything guest-facing lives in [`config.js`](config.js)** — names, dates,
venues, map URLs, the Open Graph card, the RSVP deadline and the Formspree
endpoint. It is the single source of truth: the Express server and the static
build both render from it, and `/config.json` is generated from it rather than
hand-maintained.

The values are validated on startup, so a typo fails immediately with a list of
problems instead of rendering `undefined` into the page.

Page copy that is not configuration (section headings, the timeline, the
schedule, the wishes) lives in `public/index.html`.

## How it fits together

```
config.js                  wedding content — edit this
src/
  config.js                loads + validates config.js, applies env overrides
  render.js                placeholder substitution, OG tags, HTML escaping
  security.js              CSP and security headers, defined once
  app.js                   Express app factory (no listen — testable)
  server.js                process entry: listen + graceful shutdown
scripts/
  build-static.js          renders build/ for Cloudflare
public/
  index.html               the page template (*_PLACEHOLDER tokens)
  custom.css               design tokens, fonts, animations, layout
  input.css                Tailwind entry point
  styles.css               generated — gitignored
  js/                      browser ES modules
    main.js                entry point; wires the feature modules
    countdown.js           ticking countdown
    rsvp-form.js           validation + Formspree submission
    venue-maps.js          Yandex map embeds
    petals.js              falling petal decoration
    floral-decor.js        scroll-driven corner flowers
    scroll-indicator.js    hero scroll arrow
    reveal-on-scroll.js    fade-in on intersection
    site-config.js         fetches /config.json
    environment.js         viewport + reduced-motion probes
test/                      node:test suites
```

Both renderers call `src/render.js`, so **`npm run dev` and `npm run build`
produce byte-identical HTML** — verified by a test. `renderIndexHtml` throws if
a placeholder is left unsubstituted or a replacement has no slot in the
template, which prevents the two from silently drifting apart.

## Scripts

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Tailwind watcher + auto-reloading server      |
| `npm start`          | Production Express server (builds CSS first)  |
| `npm run build`      | Minified CSS, then the static `build/` tree   |
| `npm test`           | Full test suite (`node:test`)                 |
| `npm run test:watch` | Tests in watch mode                           |
| `npm run lint`       | ESLint (`lint:fix` to autofix)                |
| `npm run format`     | Prettier (`format:check` to verify only)      |
| `npm run check`      | Everything CI runs: lint, format, test, build |
| `npm run preview`    | Build, then serve `build/` through Wrangler   |
| `npm run deploy`     | `check`, then `wrangler deploy`               |

`npm test` needs `public/styles.css`, which is generated. Run
`npm run build:css` once after a fresh clone.

## Configuration via environment

Copy `.env.example` to `.env` and load it with
`node --env-file=.env src/server.js`. All variables are optional.

| Variable             | Effect                                                   |
| -------------------- | -------------------------------------------------------- |
| `PORT` / `HOST`      | Where the server listens (defaults `3000` / `0.0.0.0`)   |
| `NODE_ENV`           | `production` caches rendered HTML; otherwise per-request |
| `BASE_URL`           | Overrides `config.js` `baseUrl` (for tunnels/staging)    |
| `FORMSPREE_ENDPOINT` | Overrides the RSVP endpoint (for testing)                |

## RSVP submissions

The form posts JSON directly to Formspree from the browser, with
`Accept: application/json` so Formspree answers with JSON instead of a
redirect. The endpoint is identical in development and production — there is no
separate server-side proxy path to keep in sync.

## Deployment

```bash
npm run deploy
```

This runs the full check suite, then `wrangler deploy`. The deployment is
static assets only (no Worker script): `build/` is uploaded as-is, and
`build/_headers` carries the CSP and hardening headers, generated from
`src/security.js` so the edge and the Express server enforce the same policy.

### Testing social previews

Open Graph scrapers need a public URL:

```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```

Then set `BASE_URL` to the tunnel URL so `og:image` and `og:url` are absolute
and correct.

## Accessibility and motion

- The timeline is a real `<ol>`; the scroll arrow is a real `<button>`.
- Field errors use `role="alert"` and toggle `aria-invalid` on their input.
- The countdown is `aria-live="off"` so the per-second tick is not announced.
- `prefers-reduced-motion: reduce` disables the petals, the scroll-driven
  floral animation and the CSS transitions.

## Tech stack

- **Express 4** with Helmet (CSP + hardening) and compression
- **Tailwind CSS 3** with PostCSS and Autoprefixer
- **Formspree** as the RSVP backend
- **Cloudflare Workers** static assets, deployed with Wrangler
- **node:test** for the test suite — no test framework dependency
