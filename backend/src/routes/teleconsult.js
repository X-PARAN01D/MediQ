'use strict';

/**
 * Teleconsult routes (/teleconsult) — assisted video consultation sessions.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/teleconsultController');

const router = express.Router();
router.use(requireAuth);

const READ_ROLES = ['doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin', 'patient'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

router.get(
  '/',
  authorize(...READ_ROLES),
  [
    query('patient_id').optional().isUUID(),
    query('doctor_id').optional().isUUID(),
    query('status').optional().isIn(['scheduled', 'ongoing', 'completed', 'cancelled']),
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
  authorize('doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin'),
  [
    body('patient_id').isUUID(),
    body('doctor_id').isUUID(),
    body('facility_id').isUUID(),
    body('scheduled_at').isISO8601(),
    body('assisted_by').optional().isUUID(),
    body('appointment_id').optional().isUUID(),
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
    body('status').isIn(['scheduled', 'ongoing', 'completed', 'cancelled']),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.updateStatus
);

module.exports = router;
