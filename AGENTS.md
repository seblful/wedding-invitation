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

**`config.js` is the single source of truth** for guest-facing content, and
**`palette.js` for every colour.** Never duplicate a value from either into
HTML, CSS or JS. Both a hand-maintained `public/config.json` and a generated
one have been and gone: the browser gets what it needs rendered into the
markup, so there is no runtime config fetch to keep in sync.

**One table, two adapters** is the shape for anything both render targets need:
`src/security.js` owns the headers, `src/caching.js` owns the cache lifetimes,
and Express and `build/_headers` both render from them. A test asserts the two
agree. Do not give either adapter a value of its own — that is exactly how
fonts came to be immutable for a year at the edge and revalidated hourly in
development.

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

Colours live in `palette.js`; `tailwind.config.js` requires it and
`src/render.js` renders the same values into `:root` custom properties.
`public/custom.css` declares no colour of its own and a test fails on one, so
there is one place to change a colour and one place it can go wrong.

A palette key **is** the utility suffix. `primary` produces `text-primary` /
`bg-primary`; a key named `text-primary` would produce `text-text-primary` and
every `text-primary` in the markup would resolve to nothing (this was a real
bug).

`test/styles.test.js` fails if the markup uses a utility class with no
generated CSS. If it flags a class, fix the name or add the value to the theme
— do not add it to an ignore list.

**Style repeated elements through a component class in `public/input.css`, not
a utility string in the markup.** `class="schedule-item"`, then
`.schedule-item { @apply ... }`. Utility soup in the HTML is how the dead
hover states got in: `hover:bg-cream` on an already-cream card, copied into
five rows, invisible in every one. `@apply` also fails the build on a class
Tailwind cannot resolve, where markup fails silently.

Two tests keep the two halves honest: every component class must reach the
stylesheet, and every component class must be used by the markup. A component
nobody references is deleted, not kept "for later".

Leave in the markup only what genuinely varies per instance — a swatch's
colour, a single overridden margin.

## Colour and focus

Contrast is measured against `--section-bg` (the green behind most sections),
not against white. `#666` body text sits at 3.9:1 there and fails AA, which is
why `secondary` is `#555`; the soft orange fails badly enough (1.6:1) that it
must not carry text or a focus ring.

That correction reached `custom.css` and not `tailwind.config.js` for months,
because the palette was written out in both. Change a colour in `palette.js`
and it reaches every rendering path at once.

Every focusable control shares one `:focus-visible` ring built from the
`--focus-ring` token. **Do not add `outline: none` or Tailwind's
`focus:outline-none`** unless you are replacing it with something that stays
visible at every breakpoint — the fields used to rely on a 2px lift that the
touch breakpoint cancels.

## Fonts

`@font-face` takes _descriptors_, not properties: `var()` does not work there.
`font-display: var(--font-display)` was silently invalid, so the fonts blocked
text while loading. A test asserts `font-display` is a literal.

Skolar PE is variable with a 300–700 `wght` axis and is declared
`font-weight: 300 700`. Narrowing that to `normal` brings back browser-faked
bold on every heading.

The static build ships only fonts something references, and prints what it
skipped. Add a font by referencing it, not by copying it into `public/fonts/`.

## Browser modules (`public/js/`)

- Keep the top level side-effect free. Only `main.js` may touch the DOM at
  import time; a test enforces this.
- Each `init*` function that reads the markup takes a `root` (defaulting to
  `document`), tolerates missing markup, returns a teardown function, and reads
  viewport state live (`environment.js`) instead of caching it at load time.
  Querying `document` directly is what made `floral-decor.js` untestable — a
  test now drives every one of them with an empty root.
- Nothing fetches at startup. Whatever a module needs is rendered onto the
  element it decorates — `data-wedding-date`, `data-map-embed` — so it works on
  first paint.
- Respect `prefersReducedMotion()` in anything animated.
- Clear intervals and remove listeners in the teardown; pause work while the
  tab is hidden.
- Build DOM with `createElement`, not `innerHTML`, so the CSP can stay strict.

## Server and security

- `src/app.js` exports a factory and never calls `listen()` — that lives in
  `src/server.js`, so tests can bind an ephemeral port. It takes its content as
  an option, so a test can hand it its own without going through the
  environment.
- Configuration is loaded by calling `loadContent()` / `loadServerConfig()`,
  never as an import side effect. When it was one, a `ConfigError` was thrown
  while `src/server.js` was still being required and escaped the try/catch that
  prints the friendly message.
- Security headers are defined once in `src/security.js` and cache lifetimes
  once in `src/caching.js`. Helmet and `express.static` apply them to Express;
  `scripts/build-static.js` writes the same policies to `build/_headers`.
  Change both targets by changing that one file.
- Do not disable CSP to make something work. Add the origin it needs.

## The RSVP form

`public/index.html` is the one place a field is described. The module builds
its payload with `new FormData(form)`, so the scripted submission **is** the
native one a guest without JavaScript posts — the two used to be described
separately and disagreed about the second-day question, filing the same answer
under two different keys depending on the browser.

So: add a question by adding the control. Nothing in `rsvp-form.js` changes.

- Which questions are mandatory is the `required` attribute, read live off the
  element. That is also how the conditional partner name works — the change
  handler sets `required` and validation reads it back, rather than restating
  the rule.
- A field's error message is the one it already points at with
  `aria-describedby`. Do not add a second attribute alongside it.
- A test fails on any `snake_case` string in the module that `index.html` has
  neither a control nor an option for.

## Accessibility

Semantic elements over ARIA patches: a real `<button>`, a real `<ol>`. Only add
`aria-label` where no visible text serves. Decorative elements get
`aria-hidden="true"` and empty `alt`, not a label repeating adjacent text.

## Commit messages

`type(scope): subject` — `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
`chore`, `perf`. Imperative mood, lowercase, no trailing period.
