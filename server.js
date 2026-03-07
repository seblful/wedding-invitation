const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const config = require('./config');

const app = express();
const PORT = config.port;

function getOgTags() {
  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const cleanImagePath = config.openGraph.image.startsWith('/')
    ? config.openGraph.image
    : `/${config.openGraph.image}`;
  const fullImageUrl = `${cleanBaseUrl}${cleanImagePath}`;

  return `
    <meta property="og:title" content="${config.openGraph.title}" />
    <meta property="og:description" content="${config.openGraph.description}" />
    <meta property="og:image" content="${fullImageUrl}" />
    <meta property="og:url" content="${cleanBaseUrl}/" />
    <meta property="og:type" content="website" />
    
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${config.openGraph.title}" />
    <meta name="twitter:description" content="${config.openGraph.description}" />
    <meta name="twitter:image" content="${fullImageUrl}" />
  `;
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.baseUrl,
];

app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const ogTags = getOgTags();

  html = html.replace('<!-- OPENGRAPH_PLACEHOLDER -->', ogTags);
  html = html.replace('THEME_COLOR_PLACEHOLDER', config.themeColor);
  html = html.replace('PAGE_TITLE_PLACEHOLDER', config.openGraph.title);
  html = html.replace('FORM_DEADLINE_PLACEHOLDER', config.form.deadline);
  html = html.replace('FORM_ACTION_PLACEHOLDER', config.api.submitFormEndpoint);
  res.send(html);
});

app.get('/api/config', (req, res) => {
  try {
    res.json({
      weddingDate: config.weddingDate,
      timezone: config.timezone,
      location: {
        name: config.location.name,
        address: config.location.address,
        yandexMapUrl: config.location.yandexMapUrl,
        yandexDirectUrl: config.location.yandexDirectUrl,
        mapDimensions: config.location.mapDimensions,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.post('/api/submit-form', async (req, res) => {
  try {
    const formData = req.body;

    if (!config.form || !config.form.formspreeEndpoint) {
      console.error('Formspree endpoint not configured');
      return res.status(500).json({ error: 'Form service not configured' });
    }

    const response = await fetch(config.form.formspreeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      res.json({ success: true });
    } else {
      console.error('Formspree error:', result);
      res
        .status(response.status)
        .json({ error: result.error || 'Form submission failed' });
    }
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const ogTags = getOgTags();

  html = html.replace('<!-- OPENGRAPH_PLACEHOLDER -->', ogTags);
  html = html.replace('THEME_COLOR_PLACEHOLDER', config.themeColor);
  html = html.replace('PAGE_TITLE_PLACEHOLDER', config.openGraph.title);
  html = html.replace('FORM_DEADLINE_PLACEHOLDER', config.form.deadline);
  html = html.replace('FORM_ACTION_PLACEHOLDER', config.api.submitFormEndpoint);
  res.status(404).send(html);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
