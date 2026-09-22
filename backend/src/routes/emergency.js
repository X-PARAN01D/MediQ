'use strict';

/**
 * Emergency routes (/emergency) — field-to-facility escalation alerts.
 * Any authenticated user may raise an alert; status changes are restricted.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/emergencyController');

const router = express.Router();
router.use(requireAuth);

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

router.get(
  '/',
  [
    query('facility_id').optional().isUUID(),
    query('status').optional().isIn(['raised', 'acknowledged', 'dispatched', 'resolved']),
    ...pageQuery,
  ],
  validate,
  controller.list
);

router.get(
  '/:id',
  [param('id').isUUID()],
  validate,
  controller.getById
);

router.post(
  '/',
  [
    body('facility_id').isUUID(),
    body('severity').isIn(['moderate', 'severe', 'critical']),
    body('description').isString().trim().isLength({ min: 1, max: 2000 }),
    body('patient_id').optional({ checkFalsy: true }).isUUID(),
    body('location').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id',
  authorize('doctor', 'facility_admin', 'system_admin'),
  [
    param('id').isUUID(),
    body('status').isIn(['raised', 'acknowledged', 'dispatched', 'resolved']),
  ],
  validate,
  controller.updateStatus
);

module.exports = router;
