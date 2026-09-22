'use strict';

/**
 * Teleconsult controller: thin HTTP layer over teleconsultService.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/teleconsultService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id, req.user)));

const create = asyncHandler(async (req, res) => {
  const session = service.create(req);
  audit(req, 'create', 'teleconsult_sessions', session.id, {
    patient_id: session.patient_id,
    doctor_id: session.doctor_id,
    facility_id: session.facility_id,
    scheduled_at: session.scheduled_at,
  });
  return created(res, session);
});

const updateStatus = asyncHandler(async (req, res) => {
  const session = service.updateStatus(req.params.id, req.body);
  audit(req, 'status_change', 'teleconsult_sessions', session.id, { status: session.status });
  return ok(res, session);
});

module.exports = { list, getById, create, updateStatus };
