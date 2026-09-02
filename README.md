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

Requires Node 22.11+ (see `.nvmrc`); Node 20 reached end of life in April 2026.

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
  input.css                Tailwind entry point + component classes
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
| `npm run check`      | Everything CI runs: lint, format, build, test |
| `npm run preview`    | Build, then serve `build/` through Wrangler   |
| `npm run deploy`     | `check`, then `wrangler deploy`               |

`npm test` needs `public/styles.css`, which is generated and gitignored. Run
`npm run build:css` once after a fresh clone — or just `npm run check`, which
builds before it tests for exactly this reason.

`build:css:prod` is a compatibility alias for `build`. The Cloudflare Pages
project's build command is set to `npm run build:css:prod` in the dashboard, so
renaming it breaks deploys. Change that field to `npm run build`, then delete
the alias.

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

## Styling

Tailwind utilities are composed into **component classes in
[`public/input.css`](public/input.css)**, so the markup carries
`class="schedule-item"` rather than a twenty-utility string repeated once per
row. Two reasons this is worth the indirection:

- A style changes in one place. The dead `hover:bg-cream` states (a cream hover
  on an already-cream card) survived as long as they did because fixing them
  meant editing ten copies.
- `@apply` **fails the build** on a class Tailwind cannot resolve. The same
  typo in markup silently produces no CSS at all — the bug behind
  `text-primary`, `bg-soft-peach` and friends doing nothing for months.

Only genuinely per-instance values stay in the HTML: a swatch's colour, a
one-off margin override.

`custom.css` keeps what Tailwind is the wrong tool for — design tokens,
`@font-face`, keyframes, the floral positioning tables and the media queries.

## Accessibility and motion

- The timeline is a real `<ol>`; the scroll arrow is a real `<button>`.
- Field errors use `role="alert"` and toggle `aria-invalid` on their input; the
  submit outcome is a `role="status"` / `role="alert"` banner that also takes
  focus, so it is announced and scrolled to rather than left below the fold.
- Every focusable control shares one `:focus-visible` ring, from the
  `--focus-ring` token in `custom.css`. Do not reintroduce `outline: none`
  without a replacement — the fields previously relied on a 2px lift that the
  touch breakpoint cancels, leaving keyboard users on a tablet with nothing.
- Text colours are chosen against `--section-bg`, not against white. `#666`
  body text measured 3.9:1 there, under the 4.5:1 AA needs.
- The countdown is `aria-live="off"` so the per-second tick is not announced.
- `prefers-reduced-motion: reduce` disables the petals, the scroll-driven
  floral animation and the CSS transitions.
- Maps are the one part of the page that needs JavaScript; each embed has a
  `<noscript>` link to the same location on Yandex Maps.

## Assets

Images in `public/images/` are derivatives sized for the page (roughly 3x their
largest rendered width). The masters — Illustrator files and full-resolution
exports — live in the gitignored `data/` directory; re-export from there rather
than upscaling what is in `public/`.

The build ships only fonts that `custom.css` or `index.html` actually
reference, and says which ones it skipped. Skolar PE is a variable font with a
300–700 weight axis, declared as `font-weight: 300 700` so bold text uses the
real Bold rather than a browser-synthesised one.

## Tech stack

- **Express 4** with Helmet (CSP + hardening) and compression
- **Tailwind CSS 3** with PostCSS and Autoprefixer
- **Formspree** as the RSVP backend
- **Cloudflare Workers** static assets, deployed with Wrangler
- **node:test** for the test suite — no test framework dependency
