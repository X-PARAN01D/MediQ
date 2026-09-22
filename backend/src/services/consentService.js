'use strict';

/**
 * Consent management (ABHA / ABDM style): a patient (or their guardian/ASHA
 * assisting them) grants a named grantee access to their health data for a
 * purpose, optionally time-bounded. Data-sharing endpoints must call
 * requireConsent() before releasing records across facilities.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');

const TRANSITIONS = {
  requested: ['granted', 'revoked', 'expired'],
  granted: ['revoked', 'expired'],
  revoked: [],
  expired: [],
};

function nowIso() {
  return new Date().toISOString();
}

function parseConsent(row) {
  return row || null;
}

/** A patient may always see their own consents; staff see consents for patients they can access. */
function listForPatient(patientId, user) {
  const patient = db.prepare('SELECT id, user_id FROM patients WHERE id = ?').get(patientId);
  if (!patient) throw new AppError(404, 'Patient not found');
  if (user.role === 'patient') {
    const own = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!own || own.id !== patientId) throw new AppError(403, 'Access denied');
  }
  return db
    .prepare('SELECT * FROM consents WHERE patient_id = ? ORDER BY created_at DESC')
    .all(patientId)
    .map(parseConsent);
}

function request({ patient_id, grantee, scope = 'read', purpose, valid_to }, req) {
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');
  if (!grantee || !grantee.trim()) throw new AppError(400, 'grantee is required');

  const id = crypto.randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO consents
       (id, patient_id, grantee, scope, purpose, status, valid_from, valid_to,
        created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?)`
  ).run(id, patient_id, grantee.trim(), scope, purpose || null, now, valid_to || null, req.user.id, now, now);

  audit(req, 'consent.requested', 'consents', id, { patient_id, grantee, scope });
  return parseConsent(db.prepare('SELECT * FROM consents WHERE id = ?').get(id));
}

function decide(id, status, req) {
  const user = req.user;
  const row = db.prepare('SELECT * FROM consents WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Consent not found');
  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(400, `Invalid consent transition: ${row.status} -> ${status}`);
  }
  // Only the patient (own record) or a system admin may grant/revoke consent.
  // Staff may request consent on a patient's behalf, but cannot decide it.
  if (user.role === 'patient') {
    const own = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
    if (!own || own.id !== row.patient_id) throw new AppError(403, 'Access denied');
  } else if (user.role !== 'system_admin') {
    throw new AppError(403, 'Only the patient or a system admin can grant or revoke consent');
  }

  const now = nowIso();
  const consentTokenRef = status === 'granted' ? crypto.randomUUID() : row.consent_token_ref;
  db.prepare(
    `UPDATE consents
       SET status = ?, consent_token_ref = ?, decided_by = ?, decided_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(status, consentTokenRef, user.id, now, now, id);

  audit(req, 'consent.' + status, 'consents', id, { patient_id: row.patient_id });
  return parseConsent(db.prepare('SELECT * FROM consents WHERE id = ?').get(id));
}

/**
 * Enforcement hook: throws 403 unless the patient has a granted, unexpired
 * consent covering the requested scope. Call it before sharing records with
 * another facility / grantee.
 */
function requireConsent(patientId, grantee, scope = 'read') {
  const now = nowIso();
  const row = db
    .prepare(
      `SELECT * FROM consents
       WHERE patient_id = ? AND grantee = ? AND status = 'granted'
         AND (valid_to IS NULL OR valid_to > ?)
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(patientId, grantee, now);
  if (!row) {
    throw new AppError(403, 'No active consent grants access to this patient data');
  }
  // A "share" consent implies read; a "read" consent does not imply share.
  const rank = { read: 1, write: 2, share: 3 };
  if ((rank[row.scope] || 0) < (rank[scope] || 0)) {
    throw new AppError(403, `Consent scope '${row.scope}' does not cover '${scope}'`);
  }
  return parseConsent(row);
}

module.exports = { listForPatient, request, decide, requireConsent };
