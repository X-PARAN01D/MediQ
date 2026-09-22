'use strict';

/**
 * Offline sync domain service.
 *
 * Bulk upsert/delete of whitelisted tables with last-write-wins conflict
 * detection: a change is a conflict when the server row's `updated_at` is
 * newer than the client's `base_updated_at`. Malformed batch items are
 * reported in `errors` without failing the whole batch; only a completely
 * invalid body shape fails the request (handled by route validation).
 *
 * Only allowlisted columns per table are ever written (unknown keys are
 * ignored) and table names come from the whitelist keys, never the client.
 */
const db = require('../db/database');
const { audit } = require('../utils/audit');

const SYNC_TABLES = {
  patients: {
    columns: ['id', 'user_id', 'abha_id', 'name', 'dob', 'gender', 'phone', 'address',
      'village', 'district', 'blood_group', 'language_pref', 'emergency_contact',
      'risk_flags', 'created_by', 'created_at', 'updated_at'],
    json: ['risk_flags'],
  },
  appointments: {
    columns: ['id', 'patient_id', 'facility_id', 'doctor_id', 'department', 'scheduled_date',
      'scheduled_time', 'token_number', 'type', 'priority', 'reason', 'status',
      'created_by', 'created_at', 'updated_at'],
    json: [],
  },
  triage_assessments: {
    columns: ['id', 'patient_id', 'facility_id', 'assessed_by', 'chief_complaint', 'symptoms',
      'vitals', 'severity', 'risk_score', 'recommended_next', 'notes', 'created_at', 'updated_at'],
    json: ['symptoms', 'vitals'],
  },
  medical_records: {
    columns: ['id', 'patient_id', 'facility_id', 'doctor_id', 'visit_date', 'visit_type',
      'diagnosis', 'diagnosis_icd', 'prescriptions', 'vitals', 'notes', 'attachments',
      'created_at', 'updated_at'],
    json: ['prescriptions', 'vitals', 'attachments'],
  },
  referrals: {
    columns: ['id', 'patient_id', 'from_facility_id', 'to_facility_id', 'referred_by', 'reason',
      'priority', 'status', 'notes', 'feedback', 'accepted_by', 'completed_at',
      'created_at', 'updated_at'],
    json: [],
  },
  followups: {
    columns: ['id', 'patient_id', 'facility_id', 'assigned_to', 'type', 'due_date', 'status',
      'notes', 'outcome', 'completed_at', 'created_at', 'updated_at'],
    json: [],
  },
};

function isIso(s) {
  return typeof s === 'string' && !Number.isNaN(Date.parse(s));
}

function parseRow(table, row) {
  if (!row) return row;
  const out = { ...row };
  for (const k of SYNC_TABLES[table].json) {
    if (typeof out[k] === 'string') {
      try {
        out[k] = JSON.parse(out[k]);
      } catch {
        // keep the raw string if it is not valid JSON
      }
    }
  }
  return out;
}

/** Keep only allowlisted, writable columns (never id / created_at). */
function sanitize(table, data) {
  const spec = SYNC_TABLES[table];
  const fields = {};
  for (const col of spec.columns) {
    if (col === 'id' || col === 'created_at') continue;
    if (data[col] === undefined) continue;
    let v = data[col];
    if (spec.json.includes(col) && v !== null && typeof v !== 'string') {
      v = JSON.stringify(v);
    }
    fields[col] = v;
  }
  return fields;
}

function applyChange(ch, applied, conflicts, errors) {
  const isObj = ch && typeof ch === 'object';
  const table = isObj ? ch.table : undefined;
  const data = isObj && ch.data && typeof ch.data === 'object' ? ch.data : {};
  const id = data.id;

  if (typeof id !== 'string' || !id.trim()) {
    errors.push({ table: table || null, id: null, error: 'change.data.id must be a non-empty string' });
    return;
  }
  if (!isIso(ch.client_updated_at) || !isIso(ch.base_updated_at)) {
    errors.push({ table, id, error: 'client_updated_at and base_updated_at must be ISO date strings' });
    return;
  }
  if (ch.op !== 'upsert' && ch.op !== 'delete') {
    errors.push({ table, id, error: "op must be 'upsert' or 'delete'" });
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(SYNC_TABLES, table)) {
    errors.push({ table, id, error: 'Table not syncable' });
    return;
  }

  try {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    const now = new Date().toISOString();

    if (ch.op === 'delete') {
      if (!row) {
        applied.push({ table, id, op: 'delete' }); // idempotent
        return;
      }
      if (row.updated_at > ch.base_updated_at) {
        conflicts.push({ table, id, server_data: parseRow(table, row), client_data: data });
        return;
      }
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      applied.push({ table, id, op: 'delete' });
      return;
    }

    // upsert
    const fields = sanitize(table, data);
    if (!row) {
      const createdAt = isIso(data.created_at) ? data.created_at : now;
      const cols = ['id', ...Object.keys(fields), 'created_at', 'updated_at'];
      const vals = [id, ...Object.values(fields), createdAt, now];
      db.prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      ).run(...vals);
      applied.push({ table, id, op: 'upsert' });
      return;
    }
    if (row.updated_at > ch.base_updated_at) {
      conflicts.push({ table, id, server_data: parseRow(table, row), client_data: data });
      return;
    }
    const setCols = Object.keys(fields);
    if (setCols.length) {
      db.prepare(
        `UPDATE ${table} SET ${setCols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`
      ).run(...Object.values(fields), now, id);
    } else {
      db.prepare(`UPDATE ${table} SET updated_at = ? WHERE id = ?`).run(now, id);
    }
    applied.push({ table, id, op: 'upsert' });
  } catch (e) {
    errors.push({ table, id, error: e.message || 'Database error' });
  }
}

function sync(req) {
  const { device_id, last_synced_at, changes } = req.body;
  const applied = [];
  const conflicts = [];
  const errors = [];

  for (const ch of changes) {
    applyChange(ch, applied, conflicts, errors);
  }

  // Rows the server has newer than the client's last sync (first sync: none).
  let server_changes = {};
  if (last_synced_at) {
    for (const table of Object.keys(SYNC_TABLES)) {
      const rows = db
        .prepare(`SELECT * FROM ${table} WHERE updated_at > ? ORDER BY updated_at ASC LIMIT 200`)
        .all(last_synced_at);
      server_changes[table] = rows.map((r) => parseRow(table, r));
    }
  }

  const server_time = new Date().toISOString();
  audit(req, 'sync', 'sync', device_id, {
    applied: applied.length,
    conflicts: conflicts.length,
    errors: errors.length,
  });

  return { applied, conflicts, errors, server_changes, server_time };
}

module.exports = { sync, SYNC_TABLES };
