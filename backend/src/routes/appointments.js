'use strict';

/**
 * Appointments routes (/appointments) — bookings with token numbers and
 * a strict status state machine.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/appointmentsController');

const router = express.Router();
router.use(requireAuth);

const READ_ROLES = ['asha_worker', 'doctor', 'specialist', 'facility_admin', 'system_admin', 'patient'];
const WRITE_ROLES = ['patient', 'asha_worker', 'doctor', 'facility_admin', 'system_admin'];
const STATUS_ROLES = ['doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin', 'patient'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

router.get(
  '/',
  authorize(...READ_ROLES),
  [
    query('facility_id').optional().isUUID(),
    query('doctor_id').optional().isUUID(),
    query('patient_id').optional().isUUID(),
    query('date').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
    query('status').optional().isIn(['scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show']),
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
  authorize(...WRITE_ROLES),
  [
    body('patient_id').optional().isUUID(),
    body('facility_id').isUUID(),
    body('doctor_id').optional().isUUID(),
    body('scheduled_date').isDate({ format: 'YYYY-MM-DD', strictMode: true }),
    body('scheduled_time').optional({ checkFalsy: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
    body('type').optional().isIn(['in_person', 'teleconsult']),
    body('priority').optional().isIn(['normal', 'high', 'emergency']),
    body('department').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('reason').optional({ checkFalsy: true }).isString().trim().isLength({ max: 1000 }),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id/status',
  authorize(...STATUS_ROLES),
  [
    param('id').isUUID(),
    body('status')
      .isIn(['scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'])
      .withMessage('Invalid status'),
  ],
  validate,
  controller.updateStatus
);

router.delete(
  '/:id',
  authorize('facility_admin', 'system_admin'),
  [param('id').isUUID()],
  validate,
  controller.remove
);

module.exports = router;
