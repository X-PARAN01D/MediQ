'use strict';

/**
 * Patients controller: thin HTTP layer over patientsService.
 * Every mutating call is audit-logged.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/patientsService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req.query);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getMe = asyncHandler(async (req, res) => ok(res, service.getOwn(req.user)));

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id, req.user)));

const create = asyncHandler(async (req, res) => {
  const patient = service.create(req.body, req.user);
  audit(req, 'create', 'patients', patient.id, { name: patient.name });
  return created(res, patient);
});

const update = asyncHandler(async (req, res) => {
  const patient = service.update(req.params.id, req.body, req.user);
  audit(req, 'update', 'patients', patient.id, { name: patient.name });
  return ok(res, patient);
});

const remove = asyncHandler(async (req, res) => {
  const result = service.remove(req.params.id, req.user);
  audit(req, 'delete', 'patients', req.params.id, {});
  return ok(res, result);
});

module.exports = { list, getMe, getById, create, update, remove };
