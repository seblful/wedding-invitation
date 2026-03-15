const fs = require('fs');
const path = require('path');
const config = require('./config');

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

function processHtml(html) {
  const ogTags = getOgTags();
  return html
    .replace('<!-- OPENGRAPH_PLACEHOLDER -->', ogTags)
    .replace('THEME_COLOR_PLACEHOLDER', config.themeColor)
    .replace('PAGE_TITLE_PLACEHOLDER', config.openGraph.title)
    .replace('FORM_DEADLINE_PLACEHOLDER', config.form.deadline)
    .replace('FORM_ACTION_PLACEHOLDER', config.form.formspreeEndpoint)
    .replace('BACKGROUND_COLOR_PLACEHOLDER', config.backgroundColor);
}

function buildStatic() {
  console.log('Building static files...');

  const publicDir = path.join(__dirname, 'public');
  const indexPath = path.join(publicDir, 'index.html');

  const html = fs.readFileSync(indexPath, 'utf8');
  const processedHtml = processHtml(html);
  fs.writeFileSync(indexPath, processedHtml);
  console.log('✓ Processed index.html');

  const configPath = path.join(publicDir, 'config.json');
  const staticConfig = {
    weddingDate: config.weddingDate,
    timezone: config.timezone,
    location: {
      name: config.location.name,
      address: config.location.address,
      yandexMapUrl: config.location.yandexMapUrl,
      yandexDirectUrl: config.location.yandexDirectUrl,
      mapDimensions: config.location.mapDimensions,
    },
    formspreeEndpoint: config.form.formspreeEndpoint,
  };
  fs.writeFileSync(configPath, JSON.stringify(staticConfig, null, 2));
  console.log('✓ Created config.json');

  console.log('Build complete!');
}

buildStatic();
