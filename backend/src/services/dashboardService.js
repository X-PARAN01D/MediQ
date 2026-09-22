'use strict';

/**
 * Dashboard domain service — read-only aggregation endpoints.
 *
 * GET /dashboard/facility : daily operations snapshot for one facility
 *   (appointments, queue, triage, referrals, diagnostics, stock, follow-ups,
 *   emergency alerts).
 * GET /dashboard/system : system-wide totals plus a per-facility roll-up
 *   (system_admin only).
 */
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { scopeFacility } = require('../utils/scope');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function count(sql, ...params) {
  return db.prepare(sql).get(...params).c;
}

function facilityDashboard(req) {
  let facilityId;
  if (req.user.role === 'system_admin') {
    facilityId = req.query.facility_id || null;
    if (!facilityId) throw new AppError(400, 'facility_id is required');
  } else {
    facilityId = scopeFacility(req);
  }

  const date = req.query.date || todayStr();
  const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(facilityId);
  if (!facility) throw new AppError(404, 'Facility not found');

  const apptRows = db
    .prepare(
      `SELECT status, COUNT(*) AS c FROM appointments
        WHERE facility_id = ? AND scheduled_date = ? GROUP BY status`
    )
    .all(facilityId, date);
  const byStatus = {};
  let apptTotal = 0;
  for (const r of apptRows) {
    byStatus[r.status] = r.c;
    apptTotal += r.c;
  }

  const queueRows = db
    .prepare(
      `SELECT status, COUNT(*) AS c FROM queue_entries
        WHERE facility_id = ? AND queue_date = ?
          AND status IN ('waiting', 'called', 'in_service') GROUP BY status`
    )
    .all(facilityId, date);
  const queue = { waiting: 0, called: 0, in_service: 0 };
  for (const r of queueRows) queue[r.status] = r.c;

  const triage = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN severity = 'red' THEN 1 ELSE 0 END), 0) AS red
         FROM triage_assessments
        WHERE facility_id = ? AND date(created_at) = ?`
    )
    .get(facilityId, date);

  return {
    facility: {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      district: facility.district,
    },
    date,
    patients_total: count('SELECT COUNT(*) AS c FROM patients'),
    appointments_today: { total: apptTotal, by_status: byStatus },
    queue_now: queue,
    triage_today: { total: triage.total, red: triage.red },
    referrals: {
      pending_outgoing: count(
        `SELECT COUNT(*) AS c FROM referrals WHERE from_facility_id = ? AND status = 'pending'`,
        facilityId
      ),
      pending_incoming: count(
        `SELECT COUNT(*) AS c FROM referrals WHERE to_facility_id = ? AND status = 'pending'`,
        facilityId
      ),
    },
    diagnostics_pending: count(
      `SELECT COUNT(*) AS c FROM diagnostic_orders
        WHERE facility_id = ? AND status IN ('ordered', 'sample_collected', 'in_process')`,
      facilityId
    ),
    low_stock_count: count(
      'SELECT COUNT(*) AS c FROM medicines WHERE facility_id = ? AND quantity <= reorder_level',
      facilityId
    ),
    followups_overdue: count(
      `SELECT COUNT(*) AS c FROM followups
        WHERE facility_id = ? AND status = 'pending' AND due_date < ?`,
      facilityId,
      date
    ),
    emergency_active: count(
      `SELECT COUNT(*) AS c FROM emergency_alerts WHERE facility_id = ? AND status != 'resolved'`,
      facilityId
    ),
  };
}

function systemDashboard() {
  const date = todayStr();
  const facilities = db
    .prepare('SELECT id, name, type, district FROM facilities WHERE is_active = 1 ORDER BY name ASC')
    .all();

  const byFacility = facilities.map((f) => ({
    facility_id: f.id,
    name: f.name,
    type: f.type,
    district: f.district,
    appointments_today: count(
      'SELECT COUNT(*) AS c FROM appointments WHERE facility_id = ? AND scheduled_date = ?',
      f.id,
      date
    ),
    queue_waiting: count(
      `SELECT COUNT(*) AS c FROM queue_entries
        WHERE facility_id = ? AND queue_date = ? AND status = 'waiting'`,
      f.id,
      date
    ),
    emergency_active: count(
      `SELECT COUNT(*) AS c FROM emergency_alerts WHERE facility_id = ? AND status != 'resolved'`,
      f.id
    ),
    low_stock: count(
      'SELECT COUNT(*) AS c FROM medicines WHERE facility_id = ? AND quantity <= reorder_level',
      f.id
    ),
  }));

  return {
    totals: {
      facilities: facilities.length,
      users: count('SELECT COUNT(*) AS c FROM users'),
      patients: count('SELECT COUNT(*) AS c FROM patients'),
      appointments_today: count(
        'SELECT COUNT(*) AS c FROM appointments WHERE scheduled_date = ?',
        date
      ),
      emergency_active: count(
        `SELECT COUNT(*) AS c FROM emergency_alerts WHERE status != 'resolved'`
      ),
      followups_overdue: count(
        `SELECT COUNT(*) AS c FROM followups WHERE status = 'pending' AND due_date < ?`,
        date
      ),
    },
    by_facility: byFacility,
  };
}

module.exports = { facilityDashboard, systemDashboard };
