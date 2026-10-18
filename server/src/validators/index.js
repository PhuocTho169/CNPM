const { ApiError } = require('../utils/errors');

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Missing required field(s): ${missing.join(', ')}`);
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toFloatOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function toBoolOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === 1 || v === '1';
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

module.exports = { requireFields, isNonEmptyString, toIntOrNull, toFloatOrNull, toBoolOrNull, isValidEmail };
