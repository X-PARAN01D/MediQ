'use strict';

/**
 * Staff user management. Admins create staff accounts here (doctors,
 * specialists, ASHA workers, lab techs, pharmacists, facility admins).
 * Clinical roles must supply a medical council licence number + speciality;
 * they start as 'pending' until a facility/system admin verifies the licence.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');
const { CLINICAL_ROLES } = require('./verificationService');

const SALT_ROUNDS = 10;
const STAFF_ROLES = ['asha_worker', 'doctor', 'specialist', 'lab_tech', 'pharmacist', 'facility_admin'];

function nowIso() {
  return new Date().toISOString();
}

function publicUser(row) {
  if (!row) return null;
  const { password_hash, otp_code, otp_expires_at, refresh_token_hash, ...pub } = row;
  return pub;
}

async function createStaff(body, req) {
  const { name, phone, role, facility_id, language_pref, license_no, speciality } = body;

  if (!STAFF_ROLES.includes(role)) {
    throw new AppError(400, `role must be one of: ${STAFF_ROLES.join(', ')}`);
  }
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)) {
    throw new AppError(409, 'An account with this phone number already exists');
  }
  if (facility_id) {
    const fac = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facility_id);
    if (!fac) throw new AppError(400, 'Facility not found');
  }
  if (CLINICAL_ROLES.includes(role) && (!license_no || !license_no.trim())) {
    throw new AppError(400, 'Doctors and specialists must provide a medical council licence number');
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  // Staff accounts start with a random password — the admin shares it out of
  // band and the user changes it on first login.
  const tempPassword = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  db.prepare(
    `INSERT INTO users
       (id, role, name, phone, password_hash, facility_id, language_pref,
        license_no, speciality, verification_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    role,
    name.trim(),
    phone,
    passwordHash,
    facility_id || null,
    language_pref || 'mr',
    license_no ? license_no.trim() : null,
    speciality ? speciality.trim() : null,
    CLINICAL_ROLES.includes(role) ? 'pending' : 'verified',
    now,
    now
  );

  audit(req, 'create', 'users', id, { role, phone, verification: 'pending' });
  return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)), temp_password: tempPassword };
}

function list(q, req) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  if (q.role) {
    where.push('u.role = ?');
    params.push(q.role);
  }
  if (q.facility_id) {
    where.push('u.facility_id = ?');
    params.push(q.facility_id);
  }
  if (req.user.role === 'facility_admin') {
    where.push('(u.facility_id = ? OR u.facility_id IS NULL)');
    params.push(req.user.facility_id);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT u.*, f.name AS facility_name FROM users u
       LEFT JOIN facilities f ON f.id = u.facility_id
       ${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(publicUser);
  return { items, page, limit, total };
}

module.exports = { createStaff, list, STAFF_ROLES };
