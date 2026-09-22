'use strict';

/**
 * Consent routes — patient consent request / grant / revoke lifecycle.
 * Consents belong to a patient; patients manage their own, staff may request
 * on a patient's behalf (assisted consent).
 */
const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/consentsController');

const router = express.Router();
router.use(requireAuth);

const ALL = ['patient', 'asha_worker', 'doctor', 'specialist', 'lab_tech', 'pharmacist', 'facility_admin', 'system_admin'];

router.get(
  '/patients/:patientId',
  authorize(...ALL),
  [param('patientId').isUUID()],
  validate,
  controller.listForPatient
);

router.post(
  '/patients/:patientId/request',
  authorize(...ALL),
  [
    param('patientId').isUUID(),
    body('grantee').trim().notEmpty().withMessage('grantee is required').isLength({ max: 200 }),
    body('scope').optional().isIn(['read', 'write', 'share']),
    body('purpose').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('valid_to').optional({ checkFalsy: true }).isISO8601(),
  ],
  validate,
  controller.request
);

router.patch(
  '/:id',
  authorize(...ALL),
  [
    param('id').isUUID(),
    body('status').isIn(['granted', 'revoked', 'expired']).withMessage('status must be granted, revoked or expired'),
  ],
  validate,
  controller.decide
);

module.exports = router;
