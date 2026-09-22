'use strict';

/** JWT authentication: verifies Bearer access tokens, attaches req.user. */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/AppError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next(new AppError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: payload.sub,
      role: payload.role,
      facility_id: payload.facility_id || null,
      name: payload.name || null,
    };
    return next();
  } catch (e) {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = { requireAuth };
