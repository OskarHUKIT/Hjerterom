/**
 * Legacy / lokal stub — ikke produksjons-BFF for BoLy (kjernelogikk: Supabase + Next.js).
 * Ikke eksponer mot åpent internett uten auth, rate limit og begrenset CORS.
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load .env file if it exists (won't crash if missing)
try {
  require('dotenv').config({ silent: true });
} catch (error) {
  console.log('Note: .env file not found, using defaults');
}

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware — begrens CORS til lokale dev-origins (unngå åpen reflektor)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Boligbank API is running' });
});

// Applications routes
app.get('/api/applications', (req, res) => {
  res.json({
    message: 'Applications endpoint',
    data: []
  });
});

app.post('/api/applications', (_req, res) => {
  res.status(501).json({
    message: 'Stub: ikke implementert — BoLy bruker Supabase. Body ekkoeres ikke (sikkerhet).',
  });
});

// Terms routes
app.get('/api/terms', (req, res) => {
  res.json({
    message: 'Terms and conditions endpoint',
    data: []
  });
});

// Documents routes
app.get('/api/documents', (req, res) => {
  res.json({
    message: 'Documents endpoint',
    data: []
  });
});

// Training routes
app.get('/api/training', (req, res) => {
  res.json({
    message: 'Training/knowledge base endpoint',
    data: []
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Boligbank API server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the application using that port.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

