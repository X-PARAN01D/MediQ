'use strict';

/** Notifications routes — the logged-in user's own in-app alerts. */
const express = require('express');
const { param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/notificationsController');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('unread').optional().isBoolean().toBoolean(),
  ],
  validate,
  controller.list
);

router.patch('/:id/read', [param('id').isUUID()], validate, controller.markRead);

module.exports = router;
