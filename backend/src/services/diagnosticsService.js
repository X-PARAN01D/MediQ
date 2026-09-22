'use strict';

/**
 * Diagnostics domain service.
 *
 * Lab test order lifecycle: ordered -> sample_collected -> in_process -> completed
 * (any state may move to cancelled). Moving to completed requires a result or
 * result_notes and stamps completed_at / performed_by.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');
const { ownPatientId, scopeFacility } = require('../utils/scope');

function pageParams(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

const TRANSITIONS = {
  ordered: ['sample_collected', 'cancelled'],
  sample_collected: ['in_process', 'cancelled'],
  in_process: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** Throws 404/403 when the current user may not see this order. */
function assertVisible(req, row) {
  const role = req.user.role;
  if (role === 'system_admin') return;
  if (role === 'patient') {
    const own = ownPatientId(db, req.user);
    if (row.patient_id !== own) throw new AppError(404, 'Diagnostic order not found');
    return;
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
    where.push('patient_id = ?');
    params.push(own);
  } else {
    if (q.patient_id) {
      where.push('patient_id = ?');
      params.push(q.patient_id);
    }
    const fid = scopeFacility(req);
    if (fid) {
      where.push('facility_id = ?');
      params.push(fid);
    }
  }
  if (q.status) {
    where.push('status = ?');
    params.push(q.status);
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM diagnostic_orders ${clause}`)
    .get(...params).c;
  const items = db
    .prepare(
      `SELECT * FROM diagnostic_orders ${clause} ORDER BY ordered_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

function getById(req) {
  const row = db.prepare('SELECT * FROM diagnostic_orders WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Diagnostic order not found');
  assertVisible(req, row);
  return row;
}

function create(req) {
  const { patient_id, test_name, test_code = null, facility_id: bodyFacility = null } = req.body;

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patient_id);
  if (!patient) throw new AppError(404, 'Patient not found');

  const facilityId =
    req.user.role === 'system_admin' ? bodyFacility : scopeFacility(req);
  if (!facilityId) throw new AppError(400, 'facility_id is required');
  const fac = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facilityId);
  if (!fac) throw new AppError(404, 'Facility not found');

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO diagnostic_orders
       (id, patient_id, facility_id, ordered_by, test_name, test_code, status, ordered_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?, ?)`
  ).run(id, patient_id, facilityId, req.user.id, test_name.trim(), test_code || null, now, now, now);

  audit(req, 'create', 'diagnostic_orders', id, { patient_id, test_name: test_name.trim() });
  return db.prepare('SELECT * FROM diagnostic_orders WHERE id = ?').get(id);
}

function updateStatus(req) {
  const row = db.prepare('SELECT * FROM diagnostic_orders WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Diagnostic order not found');
  assertVisible(req, row);

  const { status, result, result_notes } = req.body;
  if (status === undefined && result === undefined && result_notes === undefined) {
    throw new AppError(400, 'Nothing to update');
  }

  const now = new Date().toISOString();
  let newStatus = row.status;
  let completedAt = row.completed_at;
  let performedBy = row.performed_by;

  if (status !== undefined && status !== row.status) {
    if (!TRANSITIONS[row.status].includes(status)) {
      throw new AppError(400, `Invalid status transition: ${row.status} -> ${status}`);
    }
    if (status === 'completed') {
      const finalResult = result !== undefined ? result : row.result;
      const finalNotes = result_notes !== undefined ? result_notes : row.result_notes;
      if (!finalResult && !finalNotes) {
        throw new AppError(400, 'Completed orders require a result or result_notes');
      }
      completedAt = now;
      performedBy = req.user.id;
    }
    newStatus = status;
  }

  db.prepare(
    `UPDATE diagnostic_orders
       SET status = ?, result = COALESCE(?, result), result_notes = COALESCE(?, result_notes),
           completed_at = ?, performed_by = ?, updated_at = ?
     WHERE id = ?`
  ).run(newStatus, result ?? null, result_notes ?? null, completedAt, performedBy, now, row.id);

  audit(req, 'update', 'diagnostic_orders', row.id, { status: newStatus });
  return db.prepare('SELECT * FROM diagnostic_orders WHERE id = ?').get(row.id);
}

module.exports = { list, getById, create, updateStatus };
