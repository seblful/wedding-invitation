const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');

const app = express();
const PORT = 3000;

const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => {
  try {
    res.json({
      weddingDate: config.weddingDate,
      timezone: config.timezone,
      location: config.location,
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

app.use((err, req, res) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
