'use strict';

/**
 * Central configuration. All secrets come from environment variables —
 * nothing is hardcoded. In production, missing JWT secrets are fatal.
 */
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const v = process.env[name];
  if (!v && isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: parseInt(process.env.PORT || '4000', 10),

  dbUrl: process.env.DATABASE_URL || './data/arogya.db',

  jwt: {
    secret: required('JWT_SECRET') || 'dev-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: required('JWT_REFRESH_SECRET') || 'dev-only-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  meetBaseUrl: process.env.MEET_BASE_URL || 'https://meet.arogya.mh.gov.in',
  otpDemoCode: process.env.OTP_DEMO_CODE || '123456',
};
