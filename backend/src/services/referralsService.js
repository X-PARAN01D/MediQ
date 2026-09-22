'use strict';

/**
 * Referrals domain: inter-facility referral tracking with a feedback loop.
 * Accepting / completing a referral notifies staff at the referring facility.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { scopeFacility } = require('../utils/scope');
const { notifyFacilityRoles } = require('../utils/notify');

const TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function pagination(q) {
  const page = Number.isInteger(q.page) && q.page > 0 ? q.page : 1;
  const limit = Number.isInteger(q.limit) && q.limit > 0 ? Math.min(q.limit, 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}

function parseReferral(row) {
  return row || null;
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pagination(q);
  const where = [];
  const params = [];

  const hasFrom = Boolean(q.from_facility_id);
  const hasTo = Boolean(q.to_facility_id);
  if (hasFrom || hasTo) {
    if (hasFrom) { where.push('r.from_facility_id = ?'); params.push(q.from_facility_id); }
    if (hasTo) { where.push('r.to_facility_id = ?'); params.push(q.to_facility_id); }
  } else if (req.user.role !== 'system_admin') {
    const own = scopeFacility(req);
    where.push('(r.from_facility_id = ? OR r.to_facility_id = ?)');
    params.push(own, own);
  }
  if (q.status) { where.push('r.status = ?'); params.push(q.status); }
  if (q.patient_id) { where.push('r.patient_id = ?'); params.push(q.patient_id); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM referrals r ${whereSql}`).get(...params).c;
  const items = db
    .prepare(
      `SELECT r.*, p.name AS patient_name,
              ff.name AS from_facility_name, tf.name AS to_facility_name
       FROM referrals r
       JOIN patients p ON p.id = r.patient_id
       JOIN facilities ff ON ff.id = r.from_facility_id
       JOIN facilities tf ON tf.id = r.to_facility_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset)
    .map(parseReferral);
  return { items, page, limit, total };
}

function getById(id) {
  const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Referral not found');
  return parseReferral(row);
}

function create(req) {
  const b = req.body;
  const user = req.user;
  const fromFacilityId = scopeFacility(req);
  if (!fromFacilityId) {
    throw new AppError(400, 'from_facility_id is required (pass ?facility_id)');
  }

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(400, 'Patient not found');

  const toFacility = db.prepare('SELECT id, name FROM facilities WHERE id = ?').get(b.to_facility_id);
  if (!toFacility) throw new AppError(400, 'Destination facility not found');
  if (b.to_facility_id === fromFacilityId) {
    throw new AppError(400, 'to_facility_id must differ from the referring facility');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO referrals
       (id, patient_id, from_facility_id, to_facility_id, referred_by, reason,
        priority, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  ).run(
    id,
    b.patient_id,
    fromFacilityId,
    b.to_facility_id,
    user.id,
    b.reason,
    b.priority || 'normal',
    b.notes || null,
    now,
    now
  );

  notifyFacilityRoles(db, b.to_facility_id, ['facility_admin', 'doctor'], {
    type: 'referral',
    title: 'New referral received',
    body: b.reason,
    entity: 'referrals',
    entityId: id,
  });

  return parseReferral(db.prepare('SELECT * FROM referrals WHERE id = ?').get(id));
}

function updateStatus(id, body, user) {
  const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
  if (!row) throw new AppError(404, 'Referral not found');

  const nextStatus = body.status;
  const allowed = TRANSITIONS[row.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(400, `Invalid status transition: ${row.status} -> ${nextStatus}`);
  }

  const now = new Date().toISOString();
  const sets = ['status = ?', 'updated_at = ?'];
  const params = [nextStatus, now];
  if (nextStatus === 'accepted') {
    sets.push('accepted_by = ?');
    params.push(user.id);
  }
  if (nextStatus === 'completed') {
    sets.push('completed_at = ?');
    params.push(now);
  }
  if (body.feedback !== undefined) {
    sets.push('feedback = ?');
    params.push(body.feedback === '' ? null : body.feedback);
  }

  db.prepare(`UPDATE referrals SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);

  if (nextStatus === 'accepted' || nextStatus === 'completed') {
    notifyFacilityRoles(db, row.from_facility_id, ['facility_admin', 'doctor'], {
      type: 'referral',
      title: `Referral ${nextStatus}`,
      body: body.feedback || null,
      entity: 'referrals',
      entityId: id,
    });
  }

  return parseReferral(db.prepare('SELECT * FROM referrals WHERE id = ?').get(id));
}

module.exports = { list, getById, create, updateStatus };
