'use strict';

/**
 * Queue controller: thin HTTP layer over queueService.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/queueService');

const list = asyncHandler(async (req, res) => ok(res, service.list(req)));

const myToken = asyncHandler(async (req, res) => ok(res, service.myToken(req)));

const create = asyncHandler(async (req, res) => {
  const entry = service.create(req);
  audit(req, 'create', 'queue_entries', entry.id, {
    patient_id: entry.patient_id,
    facility_id: entry.facility_id,
    department: entry.department,
    token_number: entry.token_number,
  });
  return created(res, entry);
});

const callNext = asyncHandler(async (req, res) => {
  const entry = service.callNext(req);
  audit(req, 'status_change', 'queue_entries', entry.id, { status: 'called' });
  return ok(res, entry);
});

const updateStatus = asyncHandler(async (req, res) => {
  const entry = service.updateStatus(req.params.id, req.body.status);
  audit(req, 'status_change', 'queue_entries', entry.id, { status: entry.status });
  return ok(res, entry);
});

module.exports = { list, myToken, create, callNext, updateStatus };
