'use strict';

/**
 * Diagnostics routes — lab test order lifecycle
 * (ordered -> sample_collected -> in_process -> completed / cancelled).
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/diagnosticsController');

const router = express.Router();
router.use(requireAuth);

const READ = ['doctor', 'specialist', 'lab_tech', 'asha_worker', 'facility_admin', 'system_admin', 'patient'];
const STATUSES = ['ordered', 'sample_collected', 'in_process', 'completed', 'cancelled'];

router.get(
  '/',
  authorize(...READ),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('patient_id').optional().isUUID(),
    query('facility_id').optional().isUUID(),
    query('status').optional().isIn(STATUSES),
  ],
  validate,
  controller.list
);

router.get('/:id', authorize(...READ), [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('doctor', 'specialist', 'system_admin'),
  [
    body('patient_id').isUUID().withMessage('patient_id must be a valid UUID'),
    body('test_name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('test_name must be 2-100 characters'),
    body('test_code').optional().isString().isLength({ max: 50 }),
    body('facility_id').optional().isUUID(),
  ],
  validate,
  controller.create
);

router.patch(
  '/:id',
  authorize('lab_tech', 'doctor', 'specialist', 'system_admin'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(STATUSES),
    body('result').optional().isString(),
    body('result_notes').optional().isString(),
  ],
  validate,
  controller.updateStatus
);

module.exports = router;
