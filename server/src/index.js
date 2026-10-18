const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./utils/errors');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS: allow the configured frontend origin plus the usual local dev ports.
// `credentials` stays on; `origin` may be a list because we are not using cookies
// for the public guide, but the admin dashboard does send a bearer token.
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:8080'].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Basic rate limiting for public endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Static uploads
app.use('/uploads', express.static(path.resolve(config.uploadDir), {
  maxAge: '7d',
  immutable: false,
}));

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint not found.' });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] District 4 Culinary Guide API running on port ${config.port}`);
  console.log(`[server] Health: http://localhost:${config.port}/api/health`);
  // Fill in any missing per-language audio without blocking startup.
  require('./services/audioWarmupService').startInBackground();
});
