# Wedding Invitation Website

Belarusian wedding invitation website built with Node.js, Express, and Tailwind CSS.

## Setup

```bash
npm install
```

## Configuration

All wedding-specific content (names, dates, locations, Open Graph, form endpoint) is in `config.js`. Edit this file to personalize the invitation — no HTML changes needed.

## Development

Start the dev server with CSS watch and auto-reload:

```bash
npm run dev
```

## Build

Build minified CSS and generate a static `build/` directory for deployment:

```bash
npm run build
```

## Lint & Format

```bash
npm run lint       # Check code style
npm run lint:fix   # Fix auto-fixable issues
npm run format     # Format with Prettier
```

## Deployment

The project can be deployed as a static site to Cloudflare Workers/Pages:

```bash
npm run deploy     # Deploy with Wrangler
```

Requires `wrangler.jsonc` configuration — the static `build/` directory is served as assets.

## Testing Social Previews

Create a temporary public URL to test Open Graph previews:

```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```

## Tech Stack

- **Express** — server with Helmet (security) and compression
- **Tailwind CSS** + **PostCSS** — utility-first styling
- **Formspree** — form submission backend
- **Cloudflare Workers** — static/hybrid hosting via Wrangler
