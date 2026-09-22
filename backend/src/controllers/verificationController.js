'use strict';

/** Verification controller: admin review queue for doctor licences. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginated } = require('../utils/response');
const service = require('../services/verificationService');

const listPending = asyncHandler(async (req, res) => {
  const result = service.listPending(req.query);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const decide = asyncHandler(async (req, res) => {
  const doctor = service.decide(req.params.id, req.body, req);
  return ok(res, doctor);
});

module.exports = { listPending, decide };
