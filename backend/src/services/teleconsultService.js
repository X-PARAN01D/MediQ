'use strict';

/**
 * Teleconsult domain: assisted video consultation sessions (ASHA + doctor /
 * specialist). Meeting links are auto-generated from the configured base URL.
 */
const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');
const { AppError } = require('../utils/AppError');
const { ownPatientId } = require('../utils/scope');

const TRANSITIONS = {
  scheduled: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const { ensureVerified } = require('./verificationService');

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function parseSession(row) {
  return row || null;
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
  } else if (q.patient_id) {
    where.push('t.patient_id = ?');
    params.push(q.patient_id);
  }
  if (q.doctor_id) { where.push('t.doctor_id = ?'); params.push(q.doctor_id); }
  if (q.status) { where.push('t.status = ?'); params.push(q.status); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM teleconsult_sessions t ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT t.*, p.name AS patient_name, u.name AS doctor_name, f.name AS facility_name
       FROM teleconsult_sessions t
       JOIN patients p ON p.id = t.patient_id
       JOIN users u ON u.id = t.doctor_id
       JOIN facilities f ON f.id = t.facility_id
       ${whereSql}
       ORDER BY t.scheduled_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseSession);
  return { items, page, limit, total };
}

function getById(id, user) {
  const row = db.prepare('SELECT * FROM teleconsult_sessions WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Teleconsult session not found');
  if (user.role === 'patient') {
    const own = ownPatientId(db, user);
    if (row.patient_id !== own) throw new AppError(403, 'Access denied to this session');
  }
  return parseSession(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');

  const doctor = db.prepare('SELECT id, role FROM users WHERE id = ? AND is_active = 1').get(b.doctor_id);
  if (!doctor || !['doctor', 'specialist'].includes(doctor.role)) {
    throw new AppError(400, 'doctor_id must belong to an active doctor or specialist');
  }
  // Only licence-verified doctors may consult — this is how fake doctors are kept out.
  ensureVerified(b.doctor_id);

  const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(b.facility_id);
  if (!facility) throw new AppError(400, 'Facility not found');

  let assistedBy = null;
  if (b.assisted_by) {
    const asha = db.prepare('SELECT id, role FROM users WHERE id = ? AND is_active = 1').get(b.assisted_by);
    if (!asha || asha.role !== 'asha_worker') {
      throw new AppError(400, 'assisted_by must belong to an active ASHA worker');
    }
    assistedBy = b.assisted_by;
  }

  let appointmentId = null;
  if (b.appointment_id) {
    const appt = db.prepare('SELECT id FROM appointments WHERE id = ?').get(b.appointment_id);
    if (!appt) throw new AppError(400, 'Appointment not found');
    const linked = db
      .prepare('SELECT id FROM teleconsult_sessions WHERE appointment_id = ?')
      .get(b.appointment_id);
    if (linked) throw new AppError(409, 'This appointment already has a teleconsult session');
    appointmentId = b.appointment_id;
  }

  if (new Date(b.scheduled_at) <= new Date()) {
    throw new AppError(400, 'scheduled_at must be in the future');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const meetingLink = `${config.meetBaseUrl}/${id}`;
  db.prepare(
    `INSERT INTO teleconsult_sessions
       (id, appointment_id, patient_id, doctor_id, facility_id, assisted_by,
        status, scheduled_at, meeting_link, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`
  ).run(
    id,
    appointmentId,
    b.patient_id,
    b.doctor_id,
    b.facility_id,
    assistedBy,
    b.scheduled_at,
    meetingLink,
    b.notes || null,
    now,
    now
  );
  return parseSession(db.prepare('SELECT * FROM teleconsult_sessions WHERE id = ?').get(id));
}

function updateStatus(id, body) {
  const row = db.prepare('SELECT * FROM teleconsult_sessions WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Teleconsult session not found');

  const nextStatus = body.status;
  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(400, `Invalid status transition: ${row.status} -> ${nextStatus}`);
  }

  const now = new Date().toISOString();
  const sets = ['status = ?', 'updated_at = ?'];
  const params = [nextStatus, now];
  if (nextStatus === 'ongoing') {
    sets.push('started_at = ?');
    params.push(now);
  }
  if (nextStatus === 'completed') {
    sets.push('ended_at = ?');
    params.push(now);
    // Call duration: who consulted whom, and for how long.
    if (row.started_at) {
      const seconds = Math.max(0, Math.round((new Date(now) - new Date(row.started_at)) / 1000));
      sets.push('duration_seconds = ?');
      params.push(seconds);
    }
  }
  if (body.recording_ref !== undefined) {
    sets.push('recording_ref = ?');
    params.push(body.recording_ref === '' ? null : body.recording_ref);
  }
  if (body.notes !== undefined) {
    sets.push('notes = ?');
    params.push(body.notes === '' ? null : body.notes);
  }

  db.prepare(`UPDATE teleconsult_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  return parseSession(db.prepare('SELECT * FROM teleconsult_sessions WHERE id = ?').get(id));
}

module.exports = { list, getById, create, updateStatus };
