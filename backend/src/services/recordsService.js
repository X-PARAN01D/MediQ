'use strict';

/**
 * Medical records domain: longitudinal visit history per patient.
 * Only doctors / specialists may write records; staff and patients may read
 * (patients see only their own).
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId } = require('../utils/scope');

const VISIT_TYPES = ['opd', 'ipd', 'teleconsult', 'emergency', 'camp'];
const JSON_FIELDS = { prescriptions: [], vitals: {}, attachments: [] };
const UPDATE_FIELDS = [
  'visit_date', 'visit_type', 'diagnosis', 'diagnosis_icd',
  'prescriptions', 'vitals', 'notes', 'attachments',
];

function parseRecord(row) {
  if (!row) return null;
  for (const [field, fallback] of Object.entries(JSON_FIELDS)) {
    if (typeof row[field] === 'string') {
      try {
        row[field] = JSON.parse(row[field]);
      } catch {
        row[field] = fallback;
      }
    }
  }
  return row;
}

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pagination(q);

  let patientId = q.patient_id || null;
  if (req.user.role === 'patient') {
    patientId = ownPatientId(db, req.user);
  }
  if (!patientId) throw new AppError(400, 'patient_id query parameter is required');

  const where = ['r.patient_id = ?'];
  const params = [patientId];
  if (q.facility_id) { where.push('r.facility_id = ?'); params.push(q.facility_id); }
  if (q.from) { where.push('r.visit_date >= ?'); params.push(q.from); }
  if (q.to) { where.push('r.visit_date <= ?'); params.push(q.to); }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM medical_records r ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT r.*, f.name AS facility_name
       FROM medical_records r
       JOIN facilities f ON f.id = r.facility_id
       ${whereSql}
       ORDER BY r.visit_date DESC, r.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseRecord);
  return { items, page, limit, total };
}

function getById(id, user) {
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Medical record not found');
  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (row.patient_id !== own) throw new AppError(403, 'Access denied to this record');
  }
  return parseRecord(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');

  const facilityId = b.facility_id || (user.role !== 'system_admin' ? user.facility_id : null);
  if (!facilityId) throw new AppError(400, 'facility_id is required');
  const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facilityId);
  if (!facility) throw new AppError(400, 'Facility not found');

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO medical_records
       (id, patient_id, facility_id, doctor_id, visit_date, visit_type,
        diagnosis, diagnosis_icd, prescriptions, vitals, notes, attachments,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.patient_id,
    facilityId,
    user.id,
    b.visit_date,
    b.visit_type || 'opd',
    b.diagnosis || null,
    b.diagnosis_icd || null,
    b.prescriptions ? JSON.stringify(b.prescriptions) : '[]',
    b.vitals ? JSON.stringify(b.vitals) : '{}',
    b.notes || null,
    b.attachments ? JSON.stringify(b.attachments) : '[]',
    now,
    now
  );
  return parseRecord(db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id));
}

function update(id, body) {
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Medical record not found');

  const sets = [];
  const params = [];
  for (const field of UPDATE_FIELDS) {
    if (body[field] === undefined) continue;
    if (field === 'prescriptions' || field === 'attachments') {
      sets.push(`${field} = ?`);
      params.push(JSON.stringify(body[field] || []));
    } else if (field === 'vitals') {
      sets.push('vitals = ?');
      params.push(JSON.stringify(body.vitals || {}));
    } else {
      sets.push(`${field} = ?`);
      params.push(body[field] === '' ? null : body[field]);
    }
  }
  if (sets.length === 0) throw new AppError(400, 'No updatable fields provided');

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  db.prepare(`UPDATE medical_records SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return parseRecord(db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id));
}

module.exports = { list, getById, create, update, VISIT_TYPES };
