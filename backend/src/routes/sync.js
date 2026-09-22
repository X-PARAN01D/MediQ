'use strict';

/**
 * Offline sync route — bulk upsert/delete with last-write-wins conflict
 * detection for field devices. Body shape is validated here; per-item
 * problems are reported in the response `errors` array by the service.
 */
const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/syncController');

const router = express.Router();
router.use(requireAuth);

router.post(
  '/',
  authorize('asha_worker', 'doctor', 'lab_tech', 'pharmacist', 'facility_admin', 'system_admin'),
  [
    body('device_id').isString().trim().notEmpty().withMessage('device_id is required'),
    body('last_synced_at').optional({ nullable: true }).isISO8601(),
    body('changes').isArray({ max: 500 }).withMessage('changes must be an array of at most 500 items'),
  ],
  validate,
  controller.sync
);

module.exports = router;
