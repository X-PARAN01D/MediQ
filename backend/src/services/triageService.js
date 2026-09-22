'use strict';

/**
 * Triage domain: digital triage assessments by ASHA workers / doctors.
 * A 'red' severity assessment automatically raises a critical emergency
 * alert and notifies facility admins and doctors.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId, scopeFacility } = require('../utils/scope');
const { notifyFacilityRoles } = require('../utils/notify');

const SEVERITIES = ['green', 'yellow', 'red'];
const UPDATE_FIELDS = [
  'chief_complaint', 'symptoms', 'vitals', 'severity',
  'risk_score', 'recommended_next', 'notes',
];

function parseAssessment(row) {
  if (!row) return null;
  for (const f of ['symptoms', 'vitals']) {
    if (typeof row[f] === 'string') {
      try {
        row[f] = JSON.parse(row[f]);
      } catch {
        row[f] = f === 'symptoms' ? [] : {};
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
  const where = [];
  const params = [];

  if (req.user.role === 'patient') {
    const own = ownPatientId(db, req.user);
    where.push('t.patient_id = ?');
    params.push(own);
  } else {
    const facilityId = scopeFacility(req); // staff pinned; system_admin ?facility_id or null
    if (facilityId) {
      where.push('t.facility_id = ?');
      params.push(facilityId);
    }
  }
  if (q.patient_id) { where.push('t.patient_id = ?'); params.push(q.patient_id); }
  if (q.severity) { where.push('t.severity = ?'); params.push(q.severity); }
  if (q.from) { where.push('t.created_at >= ?'); params.push(q.from); }
  if (q.to) { where.push('t.created_at <= ?'); params.push(q.to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM triage_assessments t ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT t.*, p.name AS patient_name, f.name AS facility_name
       FROM triage_assessments t
       JOIN patients p ON p.id = t.patient_id
       JOIN facilities f ON f.id = t.facility_id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseAssessment);
  return { items, page, limit, total };
}

function getById(id, user) {
  const row = db.prepare('SELECT * FROM triage_assessments WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Triage assessment not found');
  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (row.patient_id !== own) throw new AppError(403, 'Access denied to this assessment');
  }
  return parseAssessment(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;

  const patient = db.prepare('SELECT id, name FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');
  const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(b.facility_id);
  if (!facility) throw new AppError(400, 'Facility not found');

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO triage_assessments
       (id, patient_id, facility_id, assessed_by, chief_complaint, symptoms, vitals,
        severity, risk_score, recommended_next, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.patient_id,
    b.facility_id,
    user.id,
    b.chief_complaint,
    b.symptoms ? JSON.stringify(b.symptoms) : '[]',
    b.vitals ? JSON.stringify(b.vitals) : '{}',
    b.severity,
    b.risk_score != null ? b.risk_score : 0,
    b.recommended_next || null,
    b.notes || null,
    now,
    now
  );

  const assessment = parseAssessment(
    db.prepare('SELECT * FROM triage_assessments WHERE id = ?').get(id)
  );

  let alertId = null;
  if (b.severity === 'red') {
    alertId = crypto.randomUUID();
    const description = `Red triage: ${b.chief_complaint}`;
    db.prepare(
      `INSERT INTO emergency_alerts
         (id, patient_id, facility_id, raised_by, severity, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'critical', ?, 'raised', ?, ?)`
    ).run(alertId, b.patient_id, b.facility_id, user.id, description, now, now);

    notifyFacilityRoles(db, b.facility_id, ['facility_admin', 'doctor'], {
      type: 'emergency',
      title: 'Critical triage alert',
      body: `${patient.name}: ${b.chief_complaint}`,
      entity: 'emergency_alerts',
      entityId: alertId,
    });
  }

  return { ...assessment, alert_id: alertId };
}

function update(id, body) {
  const row = db.prepare('SELECT * FROM triage_assessments WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Triage assessment not found');

  const sets = [];
  const params = [];
  for (const field of UPDATE_FIELDS) {
    if (body[field] === undefined) continue;
    if (field === 'symptoms') {
      sets.push('symptoms = ?');
      params.push(JSON.stringify(body.symptoms || []));
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
  db.prepare(`UPDATE triage_assessments SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return parseAssessment(db.prepare('SELECT * FROM triage_assessments WHERE id = ?').get(id));
}

module.exports = { list, getById, create, update, SEVERITIES };
