'use strict';

/**
 * Queue domain: daily OPD token queue per facility / department.
 * Tokens auto-increment per (facility, date, department); staff can call
 * the next waiting patient and move entries through the queue lifecycle.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { ownPatientId, scopeFacility } = require('../utils/scope');

const QUEUE_STATUSES = ['waiting', 'called', 'in_service', 'done', 'skipped'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseEntry(row) {
  return row || null;
}

function nextToken(facilityId, queueDate, department) {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(token_number), 0) AS m FROM queue_entries WHERE facility_id = ? AND queue_date = ? AND department = ?'
    )
    .get(facilityId, queueDate, department);
  return row.m + 1;
}

function list(req) {
  const q = req.query;
  const facilityId = scopeFacility(req); // staff pinned; system_admin ?facility_id or null
  const queueDate = q.date || today();
  const where = [];
  const params = [];
  if (facilityId) { where.push('q.facility_id = ?'); params.push(facilityId); }
  where.push('q.queue_date = ?'); params.push(queueDate);
  if (q.department) { where.push('q.department = ?'); params.push(q.department); }
  if (q.status) { where.push('q.status = ?'); params.push(q.status); }

  const items = db
    .prepare(
      `SELECT q.*, p.name AS patient_name
       FROM queue_entries q
       JOIN patients p ON p.id = q.patient_id
       WHERE ${where.join(' AND ')}
       ORDER BY q.token_number ASC`
    )
    .all(...params)
    .map(parseEntry);
  return { items, date: queueDate, facility_id: facilityId };
}

function myToken(req) {
  const own = ownPatientId(db, req.user);
  const queueDate = req.query.date || today();
  const items = db
    .prepare(
      `SELECT q.*, p.name AS patient_name
       FROM queue_entries q
       JOIN patients p ON p.id = q.patient_id
       WHERE q.patient_id = ? AND q.queue_date = ? AND q.status IN ('waiting', 'called')
       ORDER BY q.token_number ASC`
    )
    .all(own, queueDate)
    .map(parseEntry);
  return { items, date: queueDate };
}

function create(req) {
  const b = req.body;
  const facilityId = b.facility_id || scopeFacility(req);

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');
  const facility = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facilityId);
  if (!facility) throw new AppError(400, 'Facility not found');

  let appointmentId = null;
  if (b.appointment_id) {
    const appt = db.prepare('SELECT id, patient_id FROM appointments WHERE id = ?').get(b.appointment_id);
    if (!appt) throw new AppError(400, 'Appointment not found');
    if (appt.patient_id !== b.patient_id) {
      throw new AppError(400, 'Appointment does not belong to this patient');
    }
    appointmentId = b.appointment_id;
  }

  const queueDate = b.queue_date || today();
  const department = b.department || 'general';
  const token = nextToken(facilityId, queueDate, department);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO queue_entries
       (id, facility_id, queue_date, appointment_id, patient_id, department,
        token_number, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?)`
  ).run(id, facilityId, queueDate, appointmentId, b.patient_id, department, token, now, now);
  return parseEntry(db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(id));
}

function callNext(req) {
  const b = req.body || {};
  const user = req.user;
  const facilityId =
    user.role === 'system_admin' ? b.facility_id || null : scopeFacility(req);
  if (!facilityId) throw new AppError(400, 'facility_id is required');
  const queueDate = b.date || today();

  const where = ['facility_id = ?', 'queue_date = ?', "status = 'waiting'"];
  const params = [facilityId, queueDate];
  if (b.department) {
    where.push('department = ?');
    params.push(b.department);
  }
  const entry = db
    .prepare(`SELECT * FROM queue_entries WHERE ${where.join(' AND ')} ORDER BY token_number ASC LIMIT 1`)
    .get(...params);
  if (!entry) throw new AppError(404, 'No waiting patients in the queue');

  const now = new Date().toISOString();
  db.prepare("UPDATE queue_entries SET status = 'called', called_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, entry.id);
  return parseEntry(db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(entry.id));
}

function updateStatus(id, status) {
  const entry = db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(id);
  if (!entry) throw new AppError(404, 'Queue entry not found');

  const now = new Date().toISOString();
  const calledAt = status === 'called' && !entry.called_at ? now : entry.called_at;
  db.prepare('UPDATE queue_entries SET status = ?, called_at = ?, updated_at = ? WHERE id = ?')
    .run(status, calledAt, now, id);
  return parseEntry(db.prepare('SELECT * FROM queue_entries WHERE id = ?').get(id));
}

module.exports = { list, myToken, create, callNext, updateStatus, QUEUE_STATUSES };
