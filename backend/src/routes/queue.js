'use strict';

/**
 * Queue routes (/queue) — daily OPD token queue management.
 * Note: /my-token is registered before /:id so the literal path wins.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/queueController');

const router = express.Router();
router.use(requireAuth);

const STAFF = ['asha_worker', 'doctor', 'facility_admin', 'system_admin'];
const dateQuery = [query('date').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true })];

router.get(
  '/my-token',
  authorize('patient'),
  [...dateQuery],
  validate,
  controller.myToken
);

router.get(
  '/',
  authorize(...STAFF),
  [
    query('facility_id').optional().isUUID(),
    query('department').optional().isString().trim().isLength({ min: 1, max: 100 }),
    query('status').optional().isIn(['waiting', 'called', 'in_service', 'done', 'skipped']),
    ...dateQuery,
  ],
  validate,
  controller.list
);

router.post(
  '/',
  authorize('asha_worker', 'doctor', 'facility_admin', 'system_admin'),
  [
    body('patient_id').isUUID(),
    body('facility_id').optional().isUUID(),
    body('department').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('appointment_id').optional().isUUID(),
    body('queue_date').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
  ],
  validate,
  controller.create
);

router.post(
  '/next',
  authorize('doctor', 'asha_worker', 'facility_admin', 'system_admin'),
  [
    body('facility_id').optional().isUUID(),
    body('department').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('date').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
  ],
  validate,
  controller.callNext
);

router.patch(
  '/:id',
  authorize('doctor', 'asha_worker', 'facility_admin', 'system_admin'),
  [
    param('id').isUUID(),
    body('status').isIn(['called', 'in_service', 'done', 'skipped']),
  ],
  validate,
  controller.updateStatus
);

module.exports = router;
