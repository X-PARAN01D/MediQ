'use strict';

/**
 * Triage controller: thin HTTP layer over triageService.
 * A red-severity assessment also creates an emergency alert, so both
 * are audit-logged on create.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/triageService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id, req.user)));

const create = asyncHandler(async (req, res) => {
  const assessment = service.create(req);
  audit(req, 'create', 'triage_assessments', assessment.id, {
    patient_id: assessment.patient_id,
    severity: assessment.severity,
  });
  if (assessment.alert_id) {
    audit(req, 'create', 'emergency_alerts', assessment.alert_id, {
      source: 'triage_assessments',
      source_id: assessment.id,
      severity: 'critical',
    });
  }
  return created(res, assessment);
});

const update = asyncHandler(async (req, res) => {
  const assessment = service.update(req.params.id, req.body);
  audit(req, 'update', 'triage_assessments', assessment.id, {});
  return ok(res, assessment);
});

module.exports = { list, getById, create, update };
