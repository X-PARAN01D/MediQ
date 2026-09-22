'use strict';

/** Pharmacy controller — thin HTTP layer over pharmacyService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const service = require('../services/pharmacyService');

const listMedicines = asyncHandler(async (req, res) => {
  const { items, page, limit, total } = service.listMedicines(req);
  paginated(res, items, page, limit, total);
});

const upsertMedicine = asyncHandler(async (req, res) => {
  const { medicine, created: isNew } = service.upsertMedicine(req);
  if (isNew) return created(res, medicine);
  return ok(res, medicine);
});

const updateMedicine = asyncHandler(async (req, res) => {
  ok(res, service.updateMedicine(req));
});

const dispense = asyncHandler(async (req, res) => {
  created(res, service.dispense(req));
});

const dispenseLog = asyncHandler(async (req, res) => {
  const { items, page, limit, total } = service.dispenseLog(req);
  paginated(res, items, page, limit, total);
});

module.exports = { listMedicines, upsertMedicine, updateMedicine, dispense, dispenseLog };
