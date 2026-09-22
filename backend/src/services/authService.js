'use strict';

/**
 * Authentication service: password + OTP flows, JWT access/refresh tokens.
 * Refresh tokens are rotated on use; only a SHA-256 hash is stored.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');
const { AppError } = require('../utils/AppError');

const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function signAccessToken(user) {
  return jwt.sign(
    { role: user.role, facility_id: user.facility_id, name: user.name },
    config.jwt.secret,
    { subject: user.id, expiresIn: config.jwt.expiresIn }
  );
}

function signRefreshToken(user) {
  // jti guarantees every refresh token is unique, so rotation is verifiable
  // even when two tokens are issued within the same second.
  return jwt.sign({ type: 'refresh' }, config.jwt.refreshSecret, {
    subject: user.id,
    expiresIn: config.jwt.refreshExpiresIn,
    jwtid: crypto.randomUUID(),
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Strip secrets before returning a user object. */
function publicUser(row) {
  if (!row) return null;
  const { password_hash, otp_code, otp_expires_at, refresh_token_hash, ...pub } = row;
  return pub;
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByPhone(phone) {
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

function ensurePatientRow(userId, name, phone) {
  const existing = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(userId);
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO patients (id, user_id, name, phone, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, phone, userId, now, now);
  return id;
}

function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  db.prepare('UPDATE users SET refresh_token_hash = ?, last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(hashToken(refreshToken), nowIso(), nowIso(), user.id);
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: config.jwt.expiresIn,
  };
}

async function register({ name, phone, password, language_pref = 'mr' }) {
  if (getUserByPhone(phone)) {
    throw new AppError(409, 'An account with this phone number already exists');
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  db.prepare(
    `INSERT INTO users (id, role, name, phone, password_hash, language_pref, created_at, updated_at)
     VALUES (?, 'patient', ?, ?, ?, ?, ?, ?)`
  ).run(id, name, phone, passwordHash, language_pref, now, now);

  const user = getUserById(id);
  const patientId = ensurePatientRow(id, name, phone);
  return { user: publicUser(user), patient_id: patientId, ...issueTokens(user) };
}

async function login({ phone, password }) {
  const user = getUserByPhone(phone);
  if (!user || !user.password_hash) {
    throw new AppError(401, 'Invalid phone number or password');
  }
  if (!user.is_active) throw new AppError(403, 'Account is deactivated');
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError(401, 'Invalid phone number or password');

  const fresh = getUserById(user.id);
  const data = { user: publicUser(fresh), ...issueTokens(fresh) };
  if (fresh.role === 'patient') data.patient_id = ensurePatientRow(fresh.id, fresh.name, fresh.phone);
  return data;
}

/**
 * OTP login (demo-friendly). Creates a patient account on first use.
 * In non-production, the demo code is returned in the response so the
 * flow is testable without an SMS provider.
 */
function requestOtp({ phone, name }) {
  let user = getUserByPhone(phone);
  if (!user) {
    const id = crypto.randomUUID();
    const now = nowIso();
    db.prepare(
      `INSERT INTO users (id, role, name, phone, created_at, updated_at)
       VALUES (?, 'patient', ?, ?, ?, ?)`
    ).run(id, name || 'Patient', phone, now, now);
    user = getUserById(id);
  }
  if (!user.is_active) throw new AppError(403, 'Account is deactivated');

  const code = config.isProd
    ? String(Math.floor(100000 + Math.random() * 900000))
    : config.otpDemoCode;
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ?, updated_at = ? WHERE id = ?')
    .run(code, expiresAt, nowIso(), user.id);

  const result = { sent: true, expires_in_seconds: OTP_TTL_MS / 1000 };
  if (!config.isProd) result.demo_code = code; // demo mode only — never in production
  return result;
}

function verifyOtp({ phone, code }) {
  const user = getUserByPhone(phone);
  if (!user || !user.otp_code) throw new AppError(401, 'Invalid or expired OTP');
  if (!user.is_active) throw new AppError(403, 'Account is deactivated');
  if (user.otp_expires_at < nowIso()) throw new AppError(401, 'OTP has expired');

  // Constant-time comparison to avoid timing leaks
  const a = Buffer.from(String(user.otp_code));
  const b = Buffer.from(String(code));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) throw new AppError(401, 'Invalid OTP');

  db.prepare('UPDATE users SET otp_code = NULL, otp_expires_at = NULL, updated_at = ? WHERE id = ?')
    .run(nowIso(), user.id);

  const fresh = getUserById(user.id);
  const data = { user: publicUser(fresh), ...issueTokens(fresh) };
  if (fresh.role === 'patient') data.patient_id = ensurePatientRow(fresh.id, fresh.name, fresh.phone);
  return data;
}

function refresh({ refreshToken }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (e) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh') throw new AppError(401, 'Invalid refresh token');

  const user = getUserById(payload.sub);
  if (!user || !user.is_active) throw new AppError(401, 'Invalid refresh token');
  if (!user.refresh_token_hash || user.refresh_token_hash !== hashToken(refreshToken)) {
    throw new AppError(401, 'Refresh token has been revoked');
  }
  return { user: publicUser(user), ...issueTokens(user) }; // rotates the refresh token
}

function logout(userId) {
  db.prepare('UPDATE users SET refresh_token_hash = NULL, updated_at = ? WHERE id = ?')
    .run(nowIso(), userId);
  return { logged_out: true };
}

function me(userId) {
  const user = getUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  const data = { user: publicUser(user) };
  if (user.role === 'patient') {
    const p = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(userId);
    data.patient_id = p ? p.id : null;
  }
  return data;
}

module.exports = { register, login, requestOtp, verifyOtp, refresh, logout, me };
