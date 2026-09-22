'use strict';

/** Role-based access control. Usage: authorize('doctor', 'specialist') */
const { AppError } = require('../utils/AppError');

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions for this action'));
    }
    return next();
  };
}

module.exports = { authorize };
