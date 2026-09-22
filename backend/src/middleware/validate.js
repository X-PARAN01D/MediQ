'use strict';

/** express-validator result handler — returns 400 with field-level details. */
const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      400,
      'Validation failed',
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  return next();
}

module.exports = validate;
