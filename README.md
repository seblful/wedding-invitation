# Wedding Invitation Website

A simple wedding invitation website built with Node.js and Express.

## Setup

Install dependencies:

```bash
npm install
```

## Running the Server

Production:

```bash
npm start
```

Development (with auto-reload):

```bash
npm run dev
```

## Testing with Cloudflare Tunnel

To test your OpenGraph and social media previews, create a temporary public URL:

```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```

This will generate a trycloudflare.com URL that you can share to test link previews in Telegram, WhatsApp, Viber, and other platforms.
