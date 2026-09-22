'use strict';

/**
 * Pharmacy routes — medicine inventory (upsert by natural key) and the
 * transactional dispense log.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/pharmacyController');

const router = express.Router();
router.use(requireAuth);

const medicineFields = [
  body('facility_id').optional().isUUID(),
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('generic_name').optional().isString(),
  body('strength').optional().isString(),
  body('form').optional().isString(),
  body('quantity').optional().isInt({ min: 0 }).toInt(),
  body('unit').optional().isString(),
  body('reorder_level').optional().isInt({ min: 0 }).toInt(),
  body('batch_no').optional().isString(),
  body('expiry_date').optional().isISO8601(),
];

router.get(
  '/medicines',
  authorize('pharmacist', 'doctor', 'specialist', 'asha_worker', 'facility_admin', 'system_admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('facility_id').optional().isUUID(),
    query('search').optional().isString(),
    query('low_stock').optional().isBoolean().toBoolean(),
  ],
  validate,
  controller.listMedicines
);

router.post(
  '/medicines',
  authorize('pharmacist', 'facility_admin', 'system_admin'),
  medicineFields,
  validate,
  controller.upsertMedicine
);

router.put(
  '/medicines/:id',
  authorize('pharmacist', 'facility_admin', 'system_admin'),
  [
    param('id').isUUID(),
    body('facility_id').optional().isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('generic_name').optional().isString(),
    body('strength').optional().isString(),
    body('form').optional().isString(),
    body('quantity').optional().isInt({ min: 0 }).toInt(),
    body('unit').optional().isString(),
    body('reorder_level').optional().isInt({ min: 0 }).toInt(),
    body('batch_no').optional().isString(),
    body('expiry_date').optional().isISO8601(),
  ],
  validate,
  controller.updateMedicine
);

router.post(
  '/dispense',
  authorize('pharmacist', 'system_admin'),
  [
    body('patient_id').isUUID().withMessage('patient_id must be a valid UUID'),
    body('medicine_id').isUUID().withMessage('medicine_id must be a valid UUID'),
    body('quantity').isInt({ min: 1 }).toInt().withMessage('quantity must be an integer >= 1'),
    body('dosage_note').optional().isString(),
    body('record_id').optional().isUUID(),
  ],
  validate,
  controller.dispense
);

router.get(
  '/dispense-log',
  authorize('pharmacist', 'doctor', 'facility_admin', 'system_admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('patient_id').optional().isUUID(),
    query('facility_id').optional().isUUID(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  controller.dispenseLog
);

module.exports = router;
