# AGENTS.md

Instructions for AI coding agents working in this repository. Humans should
read [CONTRIBUTING.md](CONTRIBUTING.md) — it covers the same conventions in
more depth.

## What this project is

A single-page Belarusian wedding invitation. Express serves it in development;
`scripts/build-static.js` renders a static `build/` tree that Cloudflare
Workers serves in production. There is no framework and no bundler — browser
code is plain ES modules loaded with `<script type="module">`.

## Non-negotiables

**Run `npm run check` before claiming a change is done.** It runs ESLint,
Prettier, the tests and the build. A change that breaks it is not finished.

**`config.js` is the single source of truth** for guest-facing content. Never
duplicate a value from it into HTML, CSS or JS. `public/config.json` used to be
a hand-maintained copy and drifted out of sync — it is generated now.

**Both render targets go through `src/render.js`.** Never add templating logic
to `src/app.js` or `scripts/build-static.js` directly; the whole point is that
they cannot diverge. A test asserts the two outputs are byte-identical.

**Use Cyrillic `і` (U+0456) in Belarusian text, never Latin `i` (U+0069).**
They render identically and are impossible to spot by eye. Several strings
shipped with the wrong character.

## Adding a template placeholder

Both halves are required:

1. Add the `*_PLACEHOLDER` token to `public/index.html`.
2. Add the replacement to `buildReplacements()` in `src/render.js`.

`renderIndexHtml` throws if a token survives substitution or a replacement has
no slot, so a half-finished change fails loudly rather than shipping.

## Tailwind

A colour key in `tailwind.config.js` **is** the utility suffix. `primary`
produces `text-primary` / `bg-primary`; a key named `text-primary` would
produce `text-text-primary` and every `text-primary` in the markup would
resolve to nothing (this was a real bug).

`test/styles.test.js` fails if the markup uses a utility class with no
generated CSS. If it flags a class, fix the name or add the value to the theme
— do not add it to an ignore list.

## Browser modules (`public/js/`)

- Keep the top level side-effect free. Only `main.js` may touch the DOM at
  import time; a test enforces this.
- Each `init*` function tolerates missing markup, returns a teardown function,
  and reads viewport state live (`environment.js`) instead of caching it at
  load time.
- Respect `prefersReducedMotion()` in anything animated.
- Clear intervals and remove listeners in the teardown; pause work while the
  tab is hidden.
- Build DOM with `createElement`, not `innerHTML`, so the CSP can stay strict.

## Server and security

- `src/app.js` exports a factory and never calls `listen()` — that lives in
  `src/server.js`, so tests can bind an ephemeral port.
- Security headers are defined once in `src/security.js`. Helmet applies them
  to Express; `scripts/build-static.js` writes the same policy to
  `build/_headers`. Change both by changing that one file.
- Do not disable CSP to make something work. Add the origin it needs.

## Accessibility

Semantic elements over ARIA patches: a real `<button>`, a real `<ol>`. Only add
`aria-label` where no visible text serves. Decorative elements get
`aria-hidden="true"` and empty `alt`, not a label repeating adjacent text.

## Commit messages

`type(scope): subject` — `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
`chore`, `perf`. Imperative mood, lowercase, no trailing period.
