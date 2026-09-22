'use strict';

/**
 * Medical records controller: thin HTTP layer over recordsService.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/recordsService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id, req.user)));

const create = asyncHandler(async (req, res) => {
  const record = service.create(req);
  audit(req, 'create', 'medical_records', record.id, {
    patient_id: record.patient_id,
    facility_id: record.facility_id,
    visit_type: record.visit_type,
  });
  return created(res, record);
});

const update = asyncHandler(async (req, res) => {
  const record = service.update(req.params.id, req.body);
  audit(req, 'update', 'medical_records', record.id, {});
  return ok(res, record);
});

module.exports = { list, getById, create, update };
