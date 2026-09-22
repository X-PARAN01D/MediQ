'use strict';

/** Central error handler + 404. Keeps the {success,data,error} envelope. */
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: { message: `Route not found: ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);

  const message =
    status >= 500 && config.isProd ? 'Internal server error' : err.message || 'Internal server error';

  const error = { message };
  if (err.details) error.details = err.details;
  res.status(status).json({ success: false, data: null, error });
}

module.exports = { notFound, errorHandler };
