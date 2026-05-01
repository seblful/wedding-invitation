const fs = require('fs');
const path = require('path');
const config = require('./config');

const PUBLIC_DIR = path.join(__dirname, 'public');
const BUILD_DIR = path.join(__dirname, 'build');

function getOgTags() {
  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const cleanImagePath = config.openGraph.image.startsWith('/')
    ? config.openGraph.image
    : `/${config.openGraph.image}`;
  const fullImageUrl = `${cleanBaseUrl}${cleanImagePath}`;

  return [
    '<meta property="og:title" content="' + config.openGraph.title + '" />',
    '<meta property="og:description" content="' + config.openGraph.description + '" />',
    '<meta property="og:image" content="' + fullImageUrl + '" />',
    '<meta property="og:url" content="' + cleanBaseUrl + '/" />',
    '<meta property="og:type" content="website" />',
    '',
    '<meta name="twitter:card" content="summary" />',
    '<meta name="twitter:title" content="' + config.openGraph.title + '" />',
    '<meta name="twitter:description" content="' + config.openGraph.description + '" />',
    '<meta name="twitter:image" content="' + fullImageUrl + '" />',
  ].join('\n    ');
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

  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }

  fs.cpSync(PUBLIC_DIR, BUILD_DIR, { recursive: true });

  const indexPath = path.join(BUILD_DIR, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, processHtml(html));
  console.log('  Processed index.html');

  const configPath = path.join(BUILD_DIR, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    weddingDate: config.weddingDate,
    timezone: config.timezone,
    location: config.location,
    secondDayLocation: config.secondDayLocation,
    formspreeEndpoint: config.form.formspreeEndpoint,
  }, null, 2));
  console.log('  Created config.json');

  console.log('Build complete in build/');
}

buildStatic();
