'use strict';

/**
 * Users routes (/users) — admin staff-account management.
 * Only admins can create staff accounts; self-registration stays patient-only.
 */
const express = require('express');
const { body, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/usersController');
const { STAFF_ROLES } = require('../services/usersService');

const router = express.Router();
router.use(requireAuth);
router.use(authorize('facility_admin', 'system_admin'));

const phoneRule = body('phone')
  .trim()
  .notEmpty().withMessage('phone is required')
  .matches(/^[0-9+ ]{10,15}$/).withMessage('phone must be 10-15 digits');

router.get(
  '/',
  [
    query('role').optional().isString(),
    query('facility_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  controller.list
);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
    phoneRule,
    body('role').isIn(STAFF_ROLES).withMessage(`role must be one of: ${STAFF_ROLES.join(', ')}`),
    body('facility_id').optional({ checkFalsy: true }).isUUID(),
    body('language_pref').optional().isIn(['mr', 'hi', 'en']),
    body('license_no').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
    body('speciality').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  ],
  validate,
  controller.createStaff
);

module.exports = router;
