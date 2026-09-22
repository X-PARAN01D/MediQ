'use strict';

/**
 * Triage routes (/triage) — digital triage assessments.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/triageController');

const router = express.Router();
router.use(requireAuth);

const READ_ROLES = ['asha_worker', 'doctor', 'specialist', 'facility_admin', 'system_admin', 'patient'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

router.get(
  '/',
  authorize(...READ_ROLES),
  [
    query('patient_id').optional().isUUID(),
    query('facility_id').optional().isUUID(),
    query('severity').optional().isIn(['green', 'yellow', 'red']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
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
  authorize('asha_worker', 'doctor', 'specialist', 'system_admin'),
  [
    body('patient_id').isUUID(),
    body('facility_id').isUUID(),
    body('chief_complaint').isString().trim().isLength({ min: 1, max: 1000 }),
    body('severity').isIn(['green', 'yellow', 'red']),
    body('vitals').optional().isObject(),
    body('symptoms').optional().isArray(),
    body('risk_score').optional().isInt({ min: 0, max: 100 }).toInt(),
    body('recommended_next').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  authorize('doctor', 'specialist', 'system_admin'),
  [
    param('id').isUUID(),
    body('chief_complaint').optional().isString().trim().isLength({ min: 1, max: 1000 }),
    body('severity').optional().isIn(['green', 'yellow', 'red']),
    body('vitals').optional().isObject(),
    body('symptoms').optional().isArray(),
    body('risk_score').optional().isInt({ min: 0, max: 100 }).toInt(),
    body('recommended_next').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.update
);

module.exports = router;
