'use strict';

/**
 * Verification routes (/verifications) — admin review queue for doctor /
 * specialist medical-council licence verification.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/verificationController');

const router = express.Router();
router.use(requireAuth);
router.use(authorize('facility_admin', 'system_admin'));

router.get(
  '/pending',
  [
    query('facility_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  controller.listPending
);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('status').isIn(['verified', 'rejected']).withMessage("status must be 'verified' or 'rejected'"),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 1000 }),
  ],
  validate,
  controller.decide
);

module.exports = router;
