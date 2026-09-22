'use strict';

/**
 * Follow-up routes — high-risk patient follow-up tasks
 * (anc/pnc/ncd/tb/immunization/post_discharge/general).
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/followupsController');

const router = express.Router();
router.use(requireAuth);

const READ = ['asha_worker', 'doctor', 'facility_admin', 'system_admin', 'patient'];
const TYPES = ['anc', 'pnc', 'ncd', 'tb', 'immunization', 'post_discharge', 'general'];
const STATUSES = ['pending', 'done', 'missed', 'rescheduled'];

router.get(
  '/',
  authorize(...READ),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('assigned_to').optional().isUUID(),
    query('status').optional().isIn(STATUSES),
    query('type').optional().isIn(TYPES),
    query('overdue').optional().isBoolean().toBoolean(),
    query('patient_id').optional().isUUID(),
  ],
  validate,
  controller.list
);

router.get('/:id', authorize(...READ), [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('asha_worker', 'doctor', 'facility_admin', 'system_admin'),
  [
    body('patient_id').isUUID().withMessage('patient_id must be a valid UUID'),
    body('type').isIn(TYPES).withMessage('type must be one of: ' + TYPES.join(', ')),
    body('due_date').isISO8601().withMessage('due_date must be a valid date'),
    body('assigned_to').optional().isUUID(),
    body('facility_id').optional().isUUID(),
    body('notes').optional().isString(),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id',
  authorize('asha_worker', 'doctor', 'facility_admin', 'system_admin'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(STATUSES),
    body('outcome').optional().isString(),
    body('notes').optional().isString(),
    body('due_date').optional().isISO8601(),
  ],
  validate,
  controller.update
);

module.exports = router;
