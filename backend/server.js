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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Boligbanken API is running' });
});

// Applications routes
app.get('/api/applications', (req, res) => {
  res.json({
    message: 'Applications endpoint',
    data: []
  });
});

app.post('/api/applications', (req, res) => {
  res.json({
    message: 'Application created',
    data: req.body
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
  console.log(`🚀 Boligbanken API server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the application using that port.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

