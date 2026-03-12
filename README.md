# Wedding Invitation Website

A simple wedding invitation website built with Node.js, Express, and Tailwind CSS.

## Setup

Install dependencies:

```bash
npm install
```

## Development (Watch Mode)

Run Tailwind CSS in watch mode and the server in separate terminals:

**Terminal 1 - Tailwind CSS watch:**

```bash
npx tailwindcss -i ./public/input.css -o ./public/styles.css --watch
```

**Terminal 2 - Server:**

```bash
node server.js
```

## Production

Build minified CSS and start server:

```bash
npx tailwindcss -i ./public/input.css -o ./public/styles.css --minify
npm start
```

## Testing with Cloudflare Tunnel

To test your OpenGraph and social media previews, create a temporary public URL:

```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```

This will generate a trycloudflare.com URL that you can share to test link previews in Telegram, WhatsApp, Viber, and other platforms.
