'use strict';

/**
 * Appointments domain: in-person + teleconsult bookings with per-facility,
 * per-day token numbers and a strict status state machine.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId, scopeFacility } = require('../utils/scope');

const TRANSITIONS = {
  scheduled: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_consultation', 'cancelled'],
  in_consultation: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function parseAppointment(row) {
  return row || null;
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pagination(q);
  const where = [];
  const params = [];

  if (req.user.role === 'patient') {
    const own = ownPatientId(db, req.user);
    where.push('a.patient_id = ?');
    params.push(own);
  } else {
    const facilityId = scopeFacility(req);
    if (facilityId) {
      where.push('a.facility_id = ?');
      params.push(facilityId);
    }
  }
  if (q.patient_id) { where.push('a.patient_id = ?'); params.push(q.patient_id); }
  if (q.doctor_id) { where.push('a.doctor_id = ?'); params.push(q.doctor_id); }
  if (q.date) { where.push('a.scheduled_date = ?'); params.push(q.date); }
  if (q.status) { where.push('a.status = ?'); params.push(q.status); }
  if (q.facility_id && req.user.role !== 'patient') {
    // staff are already pinned by scopeFacility; allow patient-side filtering
    if (!where.some((w) => w.startsWith('a.facility_id'))) {
      where.push('a.facility_id = ?');
      params.push(q.facility_id);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM appointments a ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT a.*, p.name AS patient_name, f.name AS facility_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN facilities f ON f.id = a.facility_id
       ${whereSql}
       ORDER BY a.scheduled_date DESC, a.token_number ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseAppointment);
  return { items, page, limit, total };
}

function getById(id, user) {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Appointment not found');
  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (row.patient_id !== own) throw new AppError(403, 'Access denied to this appointment');
  }
  return parseAppointment(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;
  const patientId = user.role === 'patient' ? ownPatientId(db, user) : b.patient_id;

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
  if (!patient) throw new AppError(400, 'Patient not found');

  const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(b.facility_id);
  if (!facility) throw new AppError(400, 'Facility not found');

  let doctorId = null;
  if (b.doctor_id) {
    const doc = db.prepare('SELECT id, role FROM users WHERE id = ? AND is_active = 1').get(b.doctor_id);
    if (!doc || !['doctor', 'specialist'].includes(doc.role)) {
      throw new AppError(400, 'doctor_id must belong to an active doctor or specialist');
    }
    doctorId = b.doctor_id;
  }

  if (b.scheduled_date < today()) throw new AppError(400, 'scheduled_date cannot be in the past');

  const nextToken =
    db
      .prepare('SELECT COALESCE(MAX(token_number), 0) AS m FROM appointments WHERE facility_id = ? AND scheduled_date = ?')
      .get(b.facility_id, b.scheduled_date).m + 1;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO appointments
       (id, patient_id, facility_id, doctor_id, department, scheduled_date, scheduled_time,
        token_number, type, priority, reason, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`
  ).run(
    id,
    patientId,
    b.facility_id,
    doctorId,
    b.department || 'general',
    b.scheduled_date,
    b.scheduled_time || null,
    nextToken,
    b.type || 'in_person',
    b.priority || 'normal',
    b.reason || null,
    user.id,
    now,
    now
  );
  return parseAppointment(db.prepare('SELECT * FROM appointments WHERE id = ?').get(id));
}

function updateStatus(id, nextStatus, user) {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Appointment not found');

  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (row.patient_id !== own) throw new AppError(403, 'Access denied to this appointment');
    if (nextStatus !== 'cancelled') {
      throw new AppError(403, 'Patients may only cancel their own appointments');
    }
  }

  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(400, `Invalid status transition: ${row.status} -> ${nextStatus}`);
  }

  db.prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?')
    .run(nextStatus, new Date().toISOString(), id);
  return parseAppointment(db.prepare('SELECT * FROM appointments WHERE id = ?').get(id));
}

function remove(id) {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Appointment not found');
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  return { id, deleted: true };
}

module.exports = { list, getById, create, updateStatus, remove };
