'use strict';

/**
 * Facilities domain service — registry of sub-centres, PHCs, rural hospitals
 * and district hospitals. Creation is system-admin only; facility admins may
 * update only their own facility.
 */
const crypto = require('crypto');
const db = require('../db/database');
const { AppError } = require('../utils/AppError');
const { audit } = require('../utils/audit');

function pageParams(q) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function list(req) {
  const q = req.query;
  const { page, limit, offset } = pageParams(q);
  const where = ['is_active = 1'];
  const params = [];

  if (q.district) {
    where.push('district = ?');
    params.push(q.district);
  }
  if (q.type) {
    where.push('type = ?');
    params.push(q.type);
  }
  if (q.search) {
    where.push('name LIKE ?');
    params.push(`%${q.search}%`);
  }

  const clause = 'WHERE ' + where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS c FROM facilities ${clause}`).get(...params).c;
  const items = db
    .prepare(`SELECT * FROM facilities ${clause} ORDER BY name ASC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

function getById(req) {
  const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Facility not found');
  return row;
}

function create(req) {
  const b = req.body;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO facilities
       (id, type, name, district, block, address, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    b.type,
    b.name.trim(),
    b.district.trim(),
    b.block || null,
    b.address || null,
    b.phone || null,
    now,
    now
  );
  audit(req, 'create', 'facilities', id, { name: b.name.trim(), type: b.type });
  return db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
}

function update(req) {
  const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
  if (!row) throw new AppError(404, 'Facility not found');

  if (req.user.role === 'facility_admin' && req.user.facility_id !== row.id) {
    throw new AppError(403, 'You can only update your own facility');
  }

  const b = req.body;
  const fields = {};
  for (const k of ['name', 'type', 'district', 'block', 'address', 'phone', 'latitude', 'longitude', 'is_active']) {
    if (b[k] !== undefined) fields[k] = b[k];
  }
  if (!Object.keys(fields).length) throw new AppError(400, 'Nothing to update');

  const set = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE facilities SET ${set}, updated_at = ? WHERE id = ?`).run(
    ...Object.values(fields),
    new Date().toISOString(),
    row.id
  );
  audit(req, 'update', 'facilities', row.id, fields);
  return db.prepare('SELECT * FROM facilities WHERE id = ?').get(row.id);
}

module.exports = { list, getById, create, update };
