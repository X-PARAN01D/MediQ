'use strict';

/** Auth routes: registration, password login, OTP login, token refresh. */
const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter, otpLimiter } = require('../middleware/rateLimit');
const controller = require('../controllers/authController');

const router = express.Router();

const phoneRule = body('phone')
  .trim()
  .notEmpty().withMessage('phone is required')
  .matches(/^[0-9+ ]{10,15}$/).withMessage('phone must be 10-15 digits');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
    phoneRule,
    body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
    body('language_pref').optional().isIn(['mr', 'hi', 'en']),
  ],
  validate,
  controller.register
);

router.post(
  '/login',
  authLimiter,
  [phoneRule, body('password').notEmpty().withMessage('password is required')],
  validate,
  controller.login
);

router.post(
  '/otp/request',
  otpLimiter,
  [phoneRule, body('name').optional().trim().isLength({ min: 2, max: 100 })],
  validate,
  controller.requestOtp
);

router.post(
  '/otp/verify',
  authLimiter,
  [phoneRule, body('code').trim().matches(/^[0-9]{6}$/).withMessage('code must be a 6-digit OTP')],
  validate,
  controller.verifyOtp
);

router.post(
  '/refresh',
  authLimiter,
  [body('refresh_token').notEmpty().withMessage('refresh_token is required')],
  validate,
  controller.refresh
);

router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
