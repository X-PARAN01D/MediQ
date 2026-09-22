'use strict';

/**
 * Patients domain: longitudinal patient identity for the PHC network.
 *
 * Business logic lives here; controllers only map HTTP <-> service calls.
 * Patients are network-wide (no facility scoping) since they move between
 * facilities; patient-role users are restricted to their own record.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId } = require('../utils/scope');

function parsePatient(row) {
  if (!row) return null;
  if (typeof row.risk_flags === 'string') {
    try {
      row.risk_flags = JSON.parse(row.risk_flags);
    } catch {
      row.risk_flags = [];
    }
  }
  return row;
}

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

const STAFF_FIELDS = [
  'name', 'dob', 'gender', 'phone', 'address', 'village', 'district',
  'blood_group', 'language_pref', 'emergency_contact', 'risk_flags',
  'abha_id', 'user_id',
];
/** Fields a patient-role user may change on their own profile. */
const PATIENT_SELF_FIELDS = ['phone', 'address', 'language_pref', 'emergency_contact'];

function list(q) {
  const { page, limit, offset } = pagination(q);
  const where = [];
  const params = [];
  if (q.search) {
    where.push('(name LIKE ? OR phone LIKE ? OR abha_id LIKE ?)');
    const like = `%${q.search}%`;
    params.push(like, like, like);
  }
  if (q.district) {
    where.push('district = ?');
    params.push(q.district);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM patients ${whereSql}`).get(...params).c;
  const items = db
    .prepare(`SELECT * FROM patients ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
    .map(parsePatient);
  return { items, page, limit, total };
}

function getById(id, user) {
  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Patient not found');
  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (own !== id) throw new AppError(403, 'Access denied to this patient record');
  }
  return parsePatient(row);
}

function getOwn(user) {
  const row = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(user.id);
  if (!row) throw new AppError(404, 'Patient profile not found for this account');
  return parsePatient(row);
}

function create(body, user) {
  if (body.abha_id) {
    const dup = db.prepare('SELECT id FROM patients WHERE abha_id = ?').get(body.abha_id);
    if (dup) throw new AppError(409, 'A patient with this ABHA ID already exists');
  }
  if (body.user_id) {
    const linked = db.prepare('SELECT id FROM users WHERE id = ?').get(body.user_id);
    if (!linked) throw new AppError(400, 'Linked user not found');
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO patients
       (id, user_id, abha_id, name, dob, gender, phone, address, village, district,
        blood_group, language_pref, emergency_contact, risk_flags,
        created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    body.user_id || null,
    body.abha_id || null,
    body.name,
    body.dob || null,
    body.gender || null,
    body.phone || null,
    body.address || null,
    body.village || null,
    body.district || null,
    body.blood_group || null,
    body.language_pref || 'mr',
    body.emergency_contact || null,
    body.risk_flags ? JSON.stringify(body.risk_flags) : '[]',
    user.id,
    now,
    now
  );
  return parsePatient(db.prepare('SELECT * FROM patients WHERE id = ?').get(id));
}

function update(id, body, user) {
  const existing = getById(id, user); // also enforces patient-role access
  const allowed = user.role === 'patient' ? PATIENT_SELF_FIELDS : STAFF_FIELDS;

  if (body.abha_id && existing.abha_id !== body.abha_id) {
    const dup = db.prepare('SELECT id FROM patients WHERE abha_id = ? AND id != ?').get(body.abha_id, id);
    if (dup) throw new AppError(409, 'A patient with this ABHA ID already exists');
  }
  if (body.user_id && body.user_id !== existing.user_id) {
    const linked = db.prepare('SELECT id FROM users WHERE id = ?').get(body.user_id);
    if (!linked) throw new AppError(400, 'Linked user not found');
  }

  const sets = [];
  const params = [];
  for (const field of allowed) {
    if (body[field] === undefined) continue;
    if (field === 'risk_flags') {
      sets.push('risk_flags = ?');
      params.push(JSON.stringify(body.risk_flags || []));
    } else {
      sets.push(`${field} = ?`);
      params.push(body[field] === '' ? null : body[field]);
    }
  }
  if (sets.length === 0) throw new AppError(400, 'No updatable fields provided');

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  db.prepare(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return parsePatient(db.prepare('SELECT * FROM patients WHERE id = ?').get(id));
}

function remove(id, user) {
  getById(id, user); // 404 if missing; patient role can never reach here via routes
  db.prepare('DELETE FROM patients WHERE id = ?').run(id);
  return { id, deleted: true };
}

/**
 * Link a patient record to an ABHA ID.
 * - Looks the ABHA ID up via the configured ABHA provider (mock or ABDM).
 * - Rejects duplicates across patients.
 * - Records the event in abha_link_history for audit.
 */
async function linkAbha(id, { abha_id, phone }, req) {
  const patient = getById(id, req.user); // also enforces patient-role access
  if (patient.abha_link_status === 'linked' && patient.abha_id) {
    throw new AppError(409, 'Patient is already linked to an ABHA ID');
  }

  const abhaService = require('./abhaService');
  let record;
  if (abha_id) {
    record = await abhaService.lookup({ abha_id });
  } else if (phone || patient.phone) {
    record = await abhaService.lookup({ phone: phone || patient.phone });
  } else {
    throw new AppError(400, 'abha_id or phone is required for ABHA lookup');
  }
  if (!record || !record.abha_id) throw new AppError(404, 'No ABHA record found');

  const dup = db.prepare('SELECT id FROM patients WHERE abha_id = ? AND id != ?').get(record.abha_id, id);
  if (dup) throw new AppError(409, 'This ABHA ID is already linked to another patient');

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE patients SET abha_id = ?, abha_link_status = 'linked', updated_at = ? WHERE id = ?`
  ).run(record.abha_id, now, id);
  db.prepare(
    `INSERT INTO abha_link_history (id, patient_id, abha_id, action, performed_by, created_at)
     VALUES (?, ?, ?, 'linked', ?, ?)`
  ).run(require('crypto').randomUUID(), id, record.abha_id, req.user.id, now);

  const { audit } = require('../utils/audit');
  audit(req, 'abha.linked', 'patients', id, { abha_id: record.abha_id, provider: record.provider });
  return parsePatient(db.prepare('SELECT * FROM patients WHERE id = ?').get(id));
}

/** Unlink a patient's ABHA ID (keeps the local record; writes history). */
function unlinkAbha(id, req) {
  const patient = getById(id, req.user);
  if (patient.abha_link_status !== 'linked' || !patient.abha_id) {
    throw new AppError(409, 'Patient has no linked ABHA ID');
  }
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE patients SET abha_id = NULL, abha_link_status = 'unlinked', updated_at = ? WHERE id = ?`
  ).run(now, id);
  db.prepare(
    `INSERT INTO abha_link_history (id, patient_id, abha_id, action, performed_by, created_at)
     VALUES (?, ?, ?, 'unlinked', ?, ?)`
  ).run(require('crypto').randomUUID(), id, patient.abha_id, req.user.id, now);

  const { audit } = require('../utils/audit');
  audit(req, 'abha.unlinked', 'patients', id, { abha_id: patient.abha_id });
  return parsePatient(db.prepare('SELECT * FROM patients WHERE id = ?').get(id));
}

function abhaHistory(id, user) {
  getById(id, user); // 404 / access check
  return db
    .prepare(
      `SELECT h.*, u.name AS performed_by_name FROM abha_link_history h
       LEFT JOIN users u ON u.id = h.performed_by
       WHERE h.patient_id = ? ORDER BY h.created_at DESC`
    )
    .all(id);
}

module.exports = { list, getById, getOwn, create, update, remove, linkAbha, unlinkAbha, abhaHistory };
