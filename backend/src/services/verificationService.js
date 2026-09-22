'use strict';

/**
 * Doctor verification: tells real doctors apart from fake ones.
 *
 * Doctors/specialists register with their medical council licence number and
 * speciality. A facility_admin or system_admin reviews the licence (against
 * the state medical council register — manual step for now, API later) and
 * marks the account verified or rejected. Unverified doctors cannot be
 * assigned to teleconsultations or appointments.
 */
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');

const CLINICAL_ROLES = ['doctor', 'specialist'];

function nowIso() {
  return new Date().toISOString();
}

function publicRow(row) {
  if (!row) return null;
  const { password_hash, otp_code, otp_expires_at, refresh_token_hash, ...pub } = row;
  return pub;
}

/** Doctors awaiting verification (admin review queue). */
function listPending(q = {}) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  const offset = (page - 1) * limit;
  const where = [`role IN ('doctor','specialist')`, `verification_status = 'pending'`];
  const params = [];
  if (q.facility_id) {
    where.push('facility_id = ?');
    params.push(q.facility_id);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT u.*, f.name AS facility_name FROM users u
       LEFT JOIN facilities f ON f.id = u.facility_id
       ${whereSql} ORDER BY u.created_at ASC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(publicRow);
  return { items, page, limit, total };
}

/** Approve or reject a doctor's licence. */
function decide(doctorId, { status, notes }, req) {
  const admin = req.user;
  if (!['verified', 'rejected'].includes(status)) {
    throw new AppError(400, "status must be 'verified' or 'rejected'");
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(doctorId);
  if (!row) throw new AppError(404, 'User not found');
  if (!CLINICAL_ROLES.includes(row.role)) {
    throw new AppError(400, 'Only doctor/specialist accounts need licence verification');
  }
  if (row.verification_status === status) {
    throw new AppError(409, `Doctor is already ${status}`);
  }
  const now = nowIso();
  db.prepare(
    `UPDATE users
       SET verification_status = ?, verified_by = ?, verified_at = ?,
           verification_notes = ?, updated_at = ?
     WHERE id = ?`
  ).run(status, admin.id, now, notes || null, now, doctorId);

  audit(req, 'doctor.' + status, 'users', doctorId, { notes: notes || null });
  return publicRow(db.prepare('SELECT * FROM users WHERE id = ?').get(doctorId));
}

/** Guard used when assigning a doctor to consultations/appointments. */
function ensureVerified(doctorId) {
  const row = db.prepare('SELECT id, role, verification_status FROM users WHERE id = ?').get(doctorId);
  if (!row || !CLINICAL_ROLES.includes(row.role)) return; // handled by callers' own checks
  if (row.verification_status !== 'verified') {
    throw new AppError(
      422,
      'This doctor has not completed licence verification yet. Ask a facility admin to verify the medical council licence first.'
    );
  }
}

module.exports = { listPending, decide, ensureVerified, CLINICAL_ROLES };
