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
// CORS: allow the configured frontend origin, local dev ports, and any private
// LAN address — a guest phone on the same wifi scans the QR (pointing at
// http://<lan-ip>:8080) and must be able to call the API from that origin.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl / mobile app / same-origin
    let hostname = '';
    try {
      hostname = new URL(origin).hostname;
    } catch { /* fallthrough to reject */ }
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
    const isPrivateLan =
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
    const allowed = [config.frontendUrl, config.publicBaseUrl].filter(Boolean);
    if (isLocalhost || isPrivateLan || allowed.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
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
