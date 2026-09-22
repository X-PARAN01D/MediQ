'use strict';

/**
 * Medical records routes (/records) — longitudinal visit history.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/recordsController');

const router = express.Router();
router.use(requireAuth);

const READ_ROLES = ['doctor', 'specialist', 'asha_worker', 'pharmacist', 'facility_admin', 'system_admin', 'patient'];
const WRITE_ROLES = ['doctor', 'specialist', 'system_admin'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const dateQuery = [
  query('from').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
  query('to').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
];

const recordFields = [
  body('visit_date').isDate({ format: 'YYYY-MM-DD', strictMode: true }),
  body('visit_type').optional().isIn(['opd', 'ipd', 'teleconsult', 'emergency', 'camp']),
  body('diagnosis').optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
  body('diagnosis_icd').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
  body('prescriptions').optional().isArray(),
  body('vitals').optional().isObject(),
  body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 5000 }),
  body('attachments').optional().isArray(),
];

router.get(
  '/',
  authorize(...READ_ROLES),
  [
    query('patient_id').optional().isUUID(),
    query('facility_id').optional().isUUID(),
    ...dateQuery,
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
    body('patient_id').isUUID(),
    body('facility_id').optional().isUUID(),
    ...recordFields,
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  authorize(...WRITE_ROLES),
  [
    param('id').isUUID(),
    body('visit_date').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }),
    ...recordFields.slice(1),
  ],
  validate,
  controller.update
);

module.exports = router;
