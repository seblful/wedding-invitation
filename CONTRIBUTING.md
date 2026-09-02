# Contributing

## Setup

```bash
npm install
npm run build:css   # generates public/styles.css (gitignored)
npm run dev
```

## Before opening a pull request

```bash
npm run check
```

That runs exactly what CI runs: ESLint, a Prettier check, the test suite and
the static build. Both must be green.

## Where things go

| Change                              | Edit                                        |
| ----------------------------------- | ------------------------------------------- |
| Names, dates, venues, RSVP deadline | `config.js`                                 |
| Section copy, headings, timeline    | `public/index.html`                         |
| Colours, fonts, animations, layout  | `public/custom.css`, `tailwind.config.js`   |
| Browser behaviour                   | `public/js/<feature>.js`                    |
| Server or build behaviour           | `src/`, `scripts/`                          |
| Security headers                    | `src/security.js` (applies to both targets) |

## Conventions

### Template placeholders

`public/index.html` is a template. Tokens matching `*_PLACEHOLDER` are
substituted by `src/render.js`.

To add one: add the token to the template **and** to `buildReplacements()` in
`src/render.js`. `renderIndexHtml` throws if either half is missing, and a test
asserts the two stay in step — so a placeholder cannot rot the way
`BACKGROUND_COLOR_PLACEHOLDER` once did.

### Tailwind classes

A colour key in `tailwind.config.js` becomes the utility suffix: `primary`
yields `text-primary`, not `text-text-primary`. `test/styles.test.js` fails the
build if the markup uses a utility class that generates no CSS, so a misspelled
class is caught rather than silently doing nothing.

### Browser modules

`public/js/` is ES modules (scoped by `public/js/package.json`). Keep the top
level of every module side-effect free — only `main.js` may touch the DOM at
import time. A test enforces this, and it is what makes the modules unit
testable from Node.

Each `init*` function should:

- tolerate missing markup and return early,
- return a teardown function,
- read viewport state live rather than caching it at load time (so a resize or
  rotation is handled).

### Belarusian text

Use Cyrillic `і` (U+0456), never Latin `i` (U+0069). They look identical and
break search, sorting and screen-reader pronunciation. Several strings shipped
with the wrong one.

### Commit messages

`type(scope): subject` — `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
`chore`, `perf`. Imperative mood, lowercase, no trailing period.

```
feat(rsvp): add dietary preference field
fix(countdown): clamp negative durations to zero
docs: document the placeholder contract
```

## Testing

Tests use Node's built-in runner — no framework to install.

```bash
npm test
npm run test:watch
node --test test/render.test.js     # a single file
```

| Suite                    | Covers                                            |
| ------------------------ | ------------------------------------------------- |
| `config.test.js`         | Config validation, env overrides                  |
| `render.test.js`         | Escaping, OG tags, placeholder substitution       |
| `app.test.js`            | HTTP behaviour, headers, routing (real server)    |
| `build-static.test.js`   | Build output, dev/prod parity, `_headers`         |
| `styles.test.js`         | Every utility class in the markup resolves to CSS |
| `client-modules.test.js` | Browser module graph and pure logic               |
