'use strict';

/**
 * Emergency controller: thin HTTP layer over emergencyService.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/emergencyService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id)));

const create = asyncHandler(async (req, res) => {
  const alert = service.create(req);
  audit(req, 'create', 'emergency_alerts', alert.id, {
    facility_id: alert.facility_id,
    severity: alert.severity,
    patient_id: alert.patient_id,
  });
  return created(res, alert);
});

const updateStatus = asyncHandler(async (req, res) => {
  const alert = service.updateStatus(req.params.id, req.body.status, req.user);
  audit(req, 'status_change', 'emergency_alerts', alert.id, { status: alert.status });
  return ok(res, alert);
});

module.exports = { list, getById, create, updateStatus };
