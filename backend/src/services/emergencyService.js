'use strict';

/**
 * Emergency domain: escalation alerts from the field to the facility.
 * Any authenticated user may raise an alert; only doctors / facility
 * admins / system admins may change its status. Raising an alert notifies
 * facility admins and doctors.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId, scopeFacility } = require('../utils/scope');
const { notifyFacilityRoles } = require('../utils/notify');

const SEVERITIES = ['moderate', 'severe', 'critical'];
const TRANSITIONS = {
  raised: ['acknowledged', 'resolved'],
  acknowledged: ['dispatched', 'resolved'],
  dispatched: ['resolved'],
  resolved: [],
};

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function parseAlert(row) {
  return row || null;
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pagination(q);
  const where = [];
  const params = [];

  if (req.user.role === 'patient') {
    // Patients see only alerts they raised or that concern their patient id.
    const own = ownPatientId(db, req.user);
    where.push('(e.raised_by = ? OR e.patient_id = ?)');
    params.push(req.user.id, own);
  } else {
    const facilityId = scopeFacility(req); // staff pinned; system_admin ?facility_id or null
    if (facilityId) {
      where.push('e.facility_id = ?');
      params.push(facilityId);
    }
  }
  if (q.status) { where.push('e.status = ?'); params.push(q.status); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM emergency_alerts e ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT e.*, p.name AS patient_name, f.name AS facility_name
       FROM emergency_alerts e
       LEFT JOIN patients p ON p.id = e.patient_id
       JOIN facilities f ON f.id = e.facility_id
       ${whereSql}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseAlert);
  return { items, page, limit, total };
}

function getById(id) {
  const row = db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Emergency alert not found');
  return parseAlert(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;

  const facility = db.prepare('SELECT id, name FROM facilities WHERE id = ?').get(b.facility_id);
  if (!facility) throw new AppError(400, 'Facility not found');

  if (b.patient_id) {
    const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
    if (!patient) throw new AppError(400, 'Patient not found');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO emergency_alerts
       (id, patient_id, facility_id, raised_by, severity, description, location,
        status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'raised', ?, ?)`
  ).run(
    id,
    b.patient_id || null,
    b.facility_id,
    user.id,
    b.severity,
    b.description,
    b.location || null,
    now,
    now
  );

  notifyFacilityRoles(db, b.facility_id, ['facility_admin', 'doctor'], {
    type: 'emergency',
    title: `Emergency alert (${b.severity})`,
    body: b.description,
    entity: 'emergency_alerts',
    entityId: id,
  });

  return parseAlert(db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id));
}

function updateStatus(id, status, user) {
  const row = db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Emergency alert not found');

  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(400, `Invalid status transition: ${row.status} -> ${status}`);
  }

  const now = new Date().toISOString();
  const sets = ['status = ?', 'updated_at = ?'];
  const params = [status, now];
  if (status === 'acknowledged') {
    sets.push('acknowledged_by = ?', 'acknowledged_at = ?');
    params.push(user.id, now);
  }
  if (status === 'resolved') {
    sets.push('resolved_at = ?');
    params.push(now);
  }

  db.prepare(`UPDATE emergency_alerts SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return parseAlert(db.prepare('SELECT * FROM emergency_alerts WHERE id = ?').get(id));
}

module.exports = { list, getById, create, updateStatus, SEVERITIES };
