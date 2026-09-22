'use strict';

/**
 * Referrals controller: thin HTTP layer over referralsService.
 */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const { audit } = require('../utils/audit');
const service = require('../services/referralsService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const getById = asyncHandler(async (req, res) => ok(res, service.getById(req.params.id)));

const create = asyncHandler(async (req, res) => {
  const referral = service.create(req);
  audit(req, 'create', 'referrals', referral.id, {
    patient_id: referral.patient_id,
    from_facility_id: referral.from_facility_id,
    to_facility_id: referral.to_facility_id,
  });
  return created(res, referral);
});

const updateStatus = asyncHandler(async (req, res) => {
  const referral = service.updateStatus(req.params.id, req.body, req.user);
  audit(req, 'status_change', 'referrals', referral.id, {
    status: referral.status,
    feedback: referral.feedback,
  });
  return ok(res, referral);
});

module.exports = { list, getById, create, updateStatus };
