const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/errors');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(new ApiError(401, 'TOKEN_INVALID', 'Session expired or invalid. Please log in again.'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
