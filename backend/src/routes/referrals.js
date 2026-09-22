'use strict';

/**
 * Referrals routes (/referrals) — inter-facility referral tracking.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/referralsController');

const router = express.Router();
router.use(requireAuth);

const READ_ROLES = ['doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

router.get(
  '/',
  authorize(...READ_ROLES),
  [
    query('from_facility_id').optional().isUUID(),
    query('to_facility_id').optional().isUUID(),
    query('status').optional().isIn(['pending', 'accepted', 'completed', 'cancelled']),
    query('patient_id').optional().isUUID(),
    ...pageQuery,
  ],
  validate,
  controller.list
);

router.get(
  '/:id',
  authorize(...READ_ROLES),
  [param('id').isUUID()],
  validate,
  controller.getById
);

router.post(
  '/',
  authorize('doctor', 'specialist', 'asha_worker', 'system_admin'),
  [
    body('patient_id').isUUID(),
    body('to_facility_id').isUUID(),
    body('reason').isString().trim().isLength({ min: 1, max: 2000 }),
    body('priority').optional().isIn(['normal', 'high', 'emergency']),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id',
  authorize('doctor', 'specialist', 'facility_admin', 'system_admin'),
  [
    param('id').isUUID(),
    body('status').isIn(['pending', 'accepted', 'completed', 'cancelled']),
    body('feedback').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.updateStatus
);

module.exports = router;
