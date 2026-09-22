'use strict';

/** Application error with an HTTP status code. Thrown from services, rendered by errorHandler. */
class AppError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

module.exports = { AppError };
