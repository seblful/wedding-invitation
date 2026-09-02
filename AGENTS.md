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
not against white. `#666` body text sits at 3.9:1 there and fails AA; the
soft orange fails badly enough (1.6:1) that it must not carry text or a focus
ring.

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

## The RSVP form

`FIELDS` in `public/js/rsvp-form.js` is the one place a field is described.
Its `field` value **must** equal the element's `name` in the markup: with
JavaScript the module builds the payload, without it the browser posts the form
natively, and the two used to disagree about the second-day question — the same
answer arrived under two different keys depending on the guest's browser. A
test compares the table against `index.html`.

## Accessibility

Semantic elements over ARIA patches: a real `<button>`, a real `<ol>`. Only add
`aria-label` where no visible text serves. Decorative elements get
`aria-hidden="true"` and empty `alt`, not a label repeating adjacent text.

## Commit messages

`type(scope): subject` — `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
`chore`, `perf`. Imperative mood, lowercase, no trailing period.
