'use strict';

/**
 * Pharmacy domain service.
 *
 * Per-facility medicine inventory (upsert on the natural key
 * facility_id + name + strength + batch_no) and a transactional dispense log
 * with stock checks (409 on insufficient stock).
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');
const { scopeFacility } = require('../utils/scope');

function pageParams(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function listMedicines(req) {
  const q = req.query;
  const { page, limit, offset } = pageParams(q);
  const where = [];
  const params = [];

  const fid = scopeFacility(req);
  if (fid) {
    where.push('facility_id = ?');
    params.push(fid);
  }
  if (q.search) {
    where.push('(name LIKE ? OR generic_name LIKE ?)');
    params.push(`%${q.search}%`, `%${q.search}%`);
  }
  if (q.low_stock === true || q.low_stock === 'true') {
    where.push('quantity <= reorder_level');
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) AS c FROM medicines ${clause}`).get(...params).c;
  const items = db
    .prepare(`SELECT * FROM medicines ${clause} ORDER BY name ASC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

function upsertMedicine(req) {
  const b = req.body;
  let facilityId =
    req.user.role === 'system_admin' ? b.facility_id || null : scopeFacility(req);
  if (!facilityId) throw new AppError(400, 'facility_id is required');
  const fac = db.prepare('SELECT id FROM facilities WHERE id = ?').get(facilityId);
  if (!fac) throw new AppError(404, 'Facility not found');

  const name = (b.name || '').trim();
  if (!name) throw new AppError(400, 'name is required');
  const strength = b.strength ?? null;
  const batchNo = b.batch_no ?? null;
  const qty = b.quantity == null ? 0 : b.quantity;
  if (!Number.isInteger(qty) || qty < 0) {
    throw new AppError(400, 'quantity must be an integer >= 0');
  }

  const now = new Date().toISOString();
  const existing = db
    .prepare(
      `SELECT * FROM medicines
        WHERE facility_id = ? AND name = ? AND strength IS ? AND batch_no IS ?`
    )
    .get(facilityId, name, strength, batchNo);

  if (existing) {
    db.prepare(
      `UPDATE medicines
         SET generic_name = COALESCE(?, generic_name),
             form = COALESCE(?, form),
             unit = COALESCE(?, unit),
             reorder_level = COALESCE(?, reorder_level),
             expiry_date = COALESCE(?, expiry_date),
             quantity = quantity + ?,
             updated_at = ?
       WHERE id = ?`
    ).run(
      b.generic_name ?? null,
      b.form ?? null,
      b.unit ?? null,
      b.reorder_level ?? null,
      b.expiry_date ?? null,
      qty,
      now,
      existing.id
    );
    audit(req, 'update', 'medicines', existing.id, { added_quantity: qty });
    const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(existing.id);
    return { medicine, created: false };
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO medicines
       (id, facility_id, name, generic_name, strength, form, quantity, unit,
        reorder_level, batch_no, expiry_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    facilityId,
    name,
    b.generic_name ?? null,
    strength,
    b.form ?? null,
    qty,
    b.unit || 'tablet',
    b.reorder_level ?? 50,
    batchNo,
    b.expiry_date ?? null,
    now,
    now
  );
  audit(req, 'create', 'medicines', id, { name, quantity: qty });
  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
  return { medicine, created: true };
}

function updateMedicine(req) {
  const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Medicine not found');
  const fid = scopeFacility(req);
  if (fid && row.facility_id !== fid) throw new AppError(403, 'Access denied');

  const b = req.body;
  const fields = {};
  for (const k of ['name', 'generic_name', 'strength', 'form', 'unit', 'reorder_level', 'batch_no', 'expiry_date']) {
    if (b[k] !== undefined) fields[k] = b[k];
  }
  if (b.quantity !== undefined) {
    if (!Number.isInteger(b.quantity) || b.quantity < 0) {
      throw new AppError(400, 'quantity cannot be negative');
    }
    fields.quantity = b.quantity;
  }
  if (!Object.keys(fields).length) throw new AppError(400, 'Nothing to update');

  const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  try {
    db.prepare(`UPDATE medicines SET ${set}, updated_at = ? WHERE id = ?`).run(
      ...Object.values(fields),
      new Date().toISOString(),
      row.id
    );
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError(409, 'A medicine with the same name, strength and batch already exists');
    }
    throw e;
  }
  audit(req, 'update', 'medicines', row.id, fields);
  return db.prepare('SELECT * FROM medicines WHERE id = ?').get(row.id);
}

/** Atomic stock check + decrement + dispense row insert. */
const dispenseTx = db.transaction((args) => {
  const { medicineId, patientId, qty, dosageNote, recordId, userId } = args;
  const med = db.prepare('SELECT quantity FROM medicines WHERE id = ?').get(medicineId);
  if (!med) throw new AppError(404, 'Medicine not found');
  if (med.quantity < qty) throw new AppError(409, 'Insufficient stock');
  const now = new Date().toISOString();
  db.prepare('UPDATE medicines SET quantity = quantity - ?, updated_at = ? WHERE id = ?').run(
    qty,
    now,
    medicineId
  );
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO dispensed_medicines
       (id, patient_id, medicine_id, facility_id, record_id, quantity, dosage_note,
        dispensed_by, dispensed_at, created_at)
     VALUES (?, ?, ?, (SELECT facility_id FROM medicines WHERE id = ?), ?, ?, ?, ?, ?, ?)`
  ).run(id, patientId, medicineId, medicineId, recordId, qty, dosageNote, userId, now, now);
  return id;
});

function dispense(req) {
  const b = req.body;
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(b.patient_id);
  if (!patient) throw new AppError(404, 'Patient not found');

  let recordId = b.record_id || null;
  if (recordId) {
    const rec = db.prepare('SELECT id FROM medical_records WHERE id = ?').get(recordId);
    if (!rec) throw new AppError(404, 'Medical record not found');
  }

  const med = db.prepare('SELECT facility_id FROM medicines WHERE id = ?').get(b.medicine_id);
  if (!med) throw new AppError(404, 'Medicine not found');
  const fid = scopeFacility(req);
  // Facility-scoped staff may only dispense their own facility's stock;
  // system_admin (fid === null) may dispense from any facility.
  if (fid && med.facility_id !== fid) throw new AppError(403, 'Medicine does not belong to your facility');

  const id = dispenseTx({
    medicineId: b.medicine_id,
    patientId: b.patient_id,
    qty: b.quantity,
    dosageNote: b.dosage_note || null,
    recordId,
    userId: req.user.id,
  });
  audit(req, 'create', 'dispensed_medicines', id, {
    medicine_id: b.medicine_id,
    quantity: b.quantity,
  });
  return db.prepare('SELECT * FROM dispensed_medicines WHERE id = ?').get(id);
}

function dispenseLog(req) {
  const q = req.query;
  const { page, limit, offset } = pageParams(q);
  const where = [];
  const params = [];

  const fid = scopeFacility(req);
  if (fid) {
    where.push('d.facility_id = ?');
    params.push(fid);
  }
  if (q.patient_id) {
    where.push('d.patient_id = ?');
    params.push(q.patient_id);
  }
  if (q.from) {
    where.push('d.dispensed_at >= ?');
    params.push(q.from);
  }
  if (q.to) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
      where.push("d.dispensed_at < date(?, '+1 day')");
    } else {
      where.push('d.dispensed_at <= ?');
    }
    params.push(q.to);
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM dispensed_medicines d ${clause}`)
    .get(...params).c;
  const items = db
    .prepare(
      `SELECT d.*, m.name AS medicine_name, p.name AS patient_name
         FROM dispensed_medicines d
         JOIN medicines m ON m.id = d.medicine_id
         JOIN patients p ON p.id = d.patient_id
        ${clause}
        ORDER BY d.dispensed_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

module.exports = { listMedicines, upsertMedicine, updateMedicine, dispense, dispenseLog };
