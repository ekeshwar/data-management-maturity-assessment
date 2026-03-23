'use strict';
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const caseRoutes = require('./routes/cases');
const assessmentRoutes = require('./routes/assessments');

const app = express();

// Trust proxy for rate limiting / IP detection behind reverse proxy
app.set('trust proxy', 1);

// CORS
app.use(cors({ origin: config.frontendUrl }));

// Body parser
app.use(express.json());

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later' },
});

// Serve static files (index.html, login.html, etc.) from project root
const root = path.join(__dirname, '..');
app.use(express.static(root));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/ai', require('./routes/ai'));

// SPA fallback — serve index.html for unknown paths
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(root, 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`EDM Platform server running on http://localhost:${config.port}`);
});
