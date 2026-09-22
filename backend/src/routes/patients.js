'use strict';

/**
 * Patients routes (/patients) — network-wide patient identity records.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/patientsController');

const router = express.Router();
router.use(requireAuth);

const STAFF = ['asha_worker', 'doctor', 'specialist', 'lab_tech', 'pharmacist', 'facility_admin', 'system_admin'];
const STAFF_AND_PATIENT = [...STAFF, 'patient'];

const pageQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const patientFields = [
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9+ ]{10,15}$/),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('dob').optional({ checkFalsy: true }).isISO8601(),
  body('blood_group').optional({ checkFalsy: true }).isString().trim().isLength({ max: 10 }),
  body('abha_id').optional({ checkFalsy: true }).isString().trim().isLength({ max: 30 }),
  body('village').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  body('district').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  body('address').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
  body('language_pref').optional().isIn(['mr', 'hi', 'en']),
  body('emergency_contact').optional({ checkFalsy: true }).matches(/^[0-9+ ]{10,15}$/),
  body('risk_flags').optional().isArray(),
  body('user_id').optional({ checkFalsy: true }).isUUID(),
];

router.get('/me', authorize('patient'), controller.getMe);

router.get(
  '/',
  authorize(...STAFF),
  [
    query('search').optional().isString().trim().isLength({ max: 100 }),
    query('district').optional().isString().trim().isLength({ max: 100 }),
    ...pageQuery,
  ],
  validate,
  controller.list
);

router.get(
  '/:id',
  authorize(...STAFF_AND_PATIENT),
  [param('id').isUUID()],
  validate,
  controller.getById
);

router.post(
  '/',
  authorize('asha_worker', 'doctor', 'facility_admin', 'system_admin'),
  [
    body('name').isString().trim().isLength({ min: 2, max: 100 }),
    ...patientFields,
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  authorize('asha_worker', 'doctor', 'facility_admin', 'system_admin', 'patient'),
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
    ...patientFields,
  ],
  validate,
  controller.update
);

router.delete(
  '/:id',
  authorize('facility_admin', 'system_admin'),
  [param('id').isUUID()],
  validate,
  controller.remove
);

module.exports = router;
