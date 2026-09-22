'use strict';

/**
 * Appointments controller: thin HTTP layer over appointmentsService.
 * Status changes are audit-logged.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/appointmentsService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id, req.user)));

const create = asyncHandler(async (req, res) => {
  const appointment = service.create(req);
  audit(req, 'create', 'appointments', appointment.id, {
    patient_id: appointment.patient_id,
    facility_id: appointment.facility_id,
    scheduled_date: appointment.scheduled_date,
    token_number: appointment.token_number,
  });
  return created(res, appointment);
});

const updateStatus = asyncHandler(async (req, res) => {
  const appointment = service.updateStatus(req.params.id, req.body.status, req.user);
  audit(req, 'status_change', 'appointments', appointment.id, { status: appointment.status });
  return ok(res, appointment);
});

const remove = asyncHandler(async (req, res) => {
  const result = service.remove(req.params.id);
  audit(req, 'delete', 'appointments', req.params.id, {});
  return ok(res, result);
});

module.exports = { list, getById, create, updateStatus, remove };
