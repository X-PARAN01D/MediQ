'use strict';

/**
 * ABHA routes (/abha) — Ayushman Bharat Health Account lookup & linking.
 * Lookup/link/unlink are staff actions; patients may link their own record.
 */
const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/abhaController');

const router = express.Router();
router.use(requireAuth);

const STAFF = ['asha_worker', 'doctor', 'specialist', 'facility_admin', 'system_admin'];
const LINK_ROLES = [...STAFF, 'patient'];

router.post(
  '/lookup',
  authorize(...LINK_ROLES),
  [
    body('phone').optional().trim().matches(/^[0-9+ ]{10,15}$/).withMessage('phone must be 10-15 digits'),
    body('abha_id').optional().trim().isLength({ min: 5, max: 30 }),
  ],
  validate,
  controller.lookup
);

router.post(
  '/patients/:id/link',
  authorize(...LINK_ROLES),
  [
    param('id').isUUID(),
    body('abha_id').optional().trim().isLength({ min: 5, max: 30 }),
    body('phone').optional().trim().matches(/^[0-9+ ]{10,15}$/).withMessage('phone must be 10-15 digits'),
  ],
  validate,
  controller.link
);

router.post(
  '/patients/:id/unlink',
  authorize(...STAFF),
  [param('id').isUUID()],
  validate,
  controller.unlink
);

router.get(
  '/patients/:id/history',
  authorize(...LINK_ROLES),
  [param('id').isUUID()],
  validate,
  controller.history
);

module.exports = router;
