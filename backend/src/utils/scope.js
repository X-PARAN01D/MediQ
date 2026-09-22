'use strict';

/**
 * Data-scoping helpers enforcing tenant/role boundaries at the service layer.
 */
const { AppError } = require('./AppError');

/**
 * Returns the patient row id belonging to the logged-in patient user.
 * Throws 404 when a patient-role user has no linked patient profile.
 * Returns null for non-patient roles (no constraint).
 */
function ownPatientId(db, user) {
  if (user.role !== 'patient') return null;
  const row = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(user.id);
  if (!row) throw new AppError(404, 'Patient profile not found for this account');
  return row.id;
}

/**
 * Facility scoping: system_admin may pass ?facility_id or see everything
 * (null = no filter). Every other role is pinned to their own facility.
 * Roles without an assigned facility cannot access facility-scoped data.
 */
function scopeFacility(req) {
  if (req.user.role === 'system_admin') {
    return req.query.facility_id || null;
  }
  if (!req.user.facility_id) {
    throw new AppError(403, 'No facility assigned to this account');
  }
  return req.user.facility_id;
}

/** Staff roles that must belong to a facility. */
const FACILITY_ROLES = ['asha_worker', 'doctor', 'lab_tech', 'pharmacist', 'facility_admin'];

module.exports = { ownPatientId, scopeFacility, FACILITY_ROLES };
