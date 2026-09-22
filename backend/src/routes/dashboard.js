'use strict';

/**
 * Dashboard routes — read-only operational aggregations.
 * /facility: daily snapshot for one facility. /system: system-wide overview.
 */
const express = require('express');
const { query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/dashboardController');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/facility',
  authorize('facility_admin', 'doctor', 'system_admin', 'asha_worker'),
  [
    query('facility_id').optional().isUUID(),
    query('date').optional().isISO8601(),
  ],
  validate,
  controller.facility
);

router.get('/system', authorize('system_admin'), controller.system);

module.exports = router;
