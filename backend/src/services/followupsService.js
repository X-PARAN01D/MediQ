'use strict';

/**
 * Follow-ups domain service.
 *
 * High-risk / chronic-care follow-up tasks (ANC, PNC, NCD, TB, immunization,
 * post-discharge, general), typically assigned to ASHA workers. The assignee
 * is notified on creation.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { ownPatientId, scopeFacility } = require('../utils/scope');

function pageParams(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Throws 404/403 when the current user may not see this follow-up. */
function assertVisible(req, row) {
  const role = req.user.role;
  if (role === 'system_admin') return;
  if (role === 'patient') {
    const own = ownPatientId(db, req.user);
    if (row.patient_id !== own) throw new AppError(404, 'Follow-up not found');
    return;
  }
  if (role === 'asha_worker' && row.assigned_to !== req.user.id) {
    throw new AppError(404, 'Follow-up not found');
  }
  const fid = scopeFacility(req);
  if (row.facility_id !== fid) throw new AppError(403, 'Access denied');
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pageParams(q);
  const where = [];
  const params = [];

  if (req.user.role === 'patient') {
    const own = ownPatientId(db, req.user);
    if (q.patient_id && q.patient_id !== own) throw new AppError(403, 'Access denied');
    where.push('f.patient_id = ?');
    params.push(own);
  } else {
    if (req.user.role === 'asha_worker') {
      // ASHA workers always see only their own assigned follow-ups.
      where.push('f.assigned_to = ?');
      params.push(req.user.id);
    } else if (q.assigned_to) {
      where.push('f.assigned_to = ?');
      params.push(q.assigned_to);
    }
    if (q.patient_id) {
      where.push('f.patient_id = ?');
      params.push(q.patient_id);
    }
    const fid = scopeFacility(req);
    if (fid) {
      where.push('f.facility_id = ?');
      params.push(fid);
    }
  }
  if (q.status) {
    where.push('f.status = ?');
    params.push(q.status);
  }
  if (q.type) {
    where.push('f.type = ?');
    params.push(q.type);
  }
  if (q.overdue === true || q.overdue === 'true') {
    where.push("f.status = 'pending'");
    where.push('f.due_date < ?');
    params.push(todayStr());
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM followups f ${clause}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT f.*, p.name AS patient_name, u.name AS assigned_name
         FROM followups f
         LEFT JOIN patients p ON p.id = f.patient_id
         LEFT JOIN users u ON u.id = f.assigned_to
        ${clause}
        ORDER BY f.due_date ASC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

function getById(req) {
  const row = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Follow-up not found');
  assertVisible(req, row);
  return row;
}

function create(req) {
  const b = req.body;
  const patient = db.prepare('SELECT id, name FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(404, 'Patient not found');

  let facilityId =
    req.user.role === 'system_admin' ? b.facility_id || null : scopeFacility(req);
  if (!facilityId) throw new AppError(400, 'facility_id is required');
  const fac = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facilityId);
  if (!fac) throw new AppError(404, 'Facility not found');

  let assignedTo = b.assigned_to || null;
  if (assignedTo) {
    const u = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(assignedTo);
    if (!u) throw new AppError(404, 'Assigned user not found');
  } else {
    const asha = db
      .prepare(
        `SELECT id FROM users
          WHERE facility_id = ? AND role = 'asha_worker' AND is_active = 1
          ORDER BY created_at ASC LIMIT 1`
      )
      .get(facilityId);
    assignedTo = asha ? asha.id : null;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO followups
       (id, patient_id, facility_id, assigned_to, type, due_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(id, b.patient_id, facilityId, assignedTo, b.type, b.due_date, b.notes || null, now, now);

  if (assignedTo) {
    notify(db, assignedTo, {
      type: 'followup_assigned',
      title: 'New follow-up assigned',
      body: `${b.type.toUpperCase()} follow-up for ${patient.name}, due ${b.due_date}`,
      entity: 'followups',
      entityId: id,
    });
  }

  audit(req, 'create', 'followups', id, {
    patient_id: b.patient_id,
    type: b.type,
    assigned_to: assignedTo,
  });
  return db.prepare('SELECT * FROM followups WHERE id = ?').get(id);
}

function update(req) {
  const row = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Follow-up not found');

  if (req.user.role === 'asha_worker') {
    if (row.assigned_to !== req.user.id) {
      throw new AppError(403, 'You can only update follow-ups assigned to you');
    }
  } else {
    const fid = scopeFacility(req);
    if (fid && row.facility_id !== fid) throw new AppError(403, 'Access denied');
  }

  const b = req.body;
  const fields = {};
  const now = new Date().toISOString();

  if (b.status !== undefined) {
    if (b.status === 'rescheduled' && !b.due_date) {
      throw new AppError(400, 'Rescheduling requires a new due_date');
    }
    fields.status = b.status;
    if (b.status === 'done') fields.completed_at = now;
  }
  if (b.outcome !== undefined) fields.outcome = b.outcome;
  if (b.notes !== undefined) fields.notes = b.notes;
  if (b.due_date !== undefined) fields.due_date = b.due_date;
  if (!Object.keys(fields).length) throw new AppError(400, 'Nothing to update');

  const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE followups SET ${set}, updated_at = ? WHERE id = ?`).run(
    ...Object.values(fields),
    now,
    row.id
  );

  audit(req, 'update', 'followups', row.id, fields);
  return db.prepare('SELECT * FROM followups WHERE id = ?').get(row.id);
}

module.exports = { list, getById, create, update };
