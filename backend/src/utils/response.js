'use strict';

/**
 * Consistent API envelope: every endpoint returns
 *   { success: true,  data: <...>, error: null }   on success
 *   { success: false, data: null,  error: { message, details? } } on failure
 */

function ok(res, data = null, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

function created(res, data = null) {
  return ok(res, data, 201);
}

function paginated(res, items, page, limit, total) {
  return ok(res, {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

function fail(res, status, message, details = null) {
  const error = { message };
  if (details) error.details = details;
  return res.status(status).json({ success: false, data: null, error });
}

module.exports = { ok, created, paginated, fail };
