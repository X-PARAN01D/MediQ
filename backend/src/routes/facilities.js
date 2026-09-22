'use strict';

/**
 * Facilities routes — registry of sub-centres, PHCs, rural hospitals and
 * district hospitals.
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const controller = require('../controllers/facilitiesController');

const router = express.Router();
router.use(requireAuth);

const TYPES = ['sub_centre', 'phc', 'rural_hospital', 'district_hospital'];

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('district').optional().isString(),
    query('type').optional().isIn(TYPES),
    query('search').optional().isString(),
  ],
  validate,
  controller.list
);

router.get('/:id', [param('id').isUUID()], validate, controller.getById);

router.post(
  '/',
  authorize('system_admin'),
  [
    body('name').isString().trim().notEmpty().withMessage('name is required'),
    body('type').isIn(TYPES).withMessage('type must be one of: ' + TYPES.join(', ')),
    body('district').isString().trim().notEmpty().withMessage('district is required'),
    body('block').optional().isString(),
    body('address').optional().isString(),
    body('phone').optional().isString(),
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  authorize('system_admin', 'facility_admin'),
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('type').optional().isIn(TYPES),
    body('district').optional().isString().trim().notEmpty(),
    body('block').optional().isString(),
    body('address').optional().isString(),
    body('phone').optional().isString(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('is_active').optional().isInt({ min: 0, max: 1 }).toInt(),
  ],
  validate,
  controller.update
);

module.exports = router;
