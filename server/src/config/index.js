require('dotenv').config();
const pg = require('pg');

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://district4_user:district4_password@localhost:5432/district4_food',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || ['http://localhost:5173'],
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  ttsProvider: process.env.TTS_PROVIDER || '',
  ttsApiKey: process.env.TTS_API_KEY || '',
};

// The pg driver needs to parse the connection string properly with IPv4/IPv6 hosts
if (pg.types) {
  pg.types.setTypeParser(20, (val) => parseInt(val, 10)); // int8 -> number
  pg.types.setTypeParser(1700, (val) => parseFloat(val)); // numeric -> number
}

module.exports = config;
