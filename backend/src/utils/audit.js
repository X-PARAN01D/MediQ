'use strict';

/**
 * Fire-and-forget audit logging. Writes to audit_logs; never fails the
 * request — audit failures are logged to console only.
 */
const crypto = require('crypto');

function audit(req, action, entity, entityId, details = {}) {
  try {
    const db = require('../db/database');
    db.prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      req.user ? req.user.id : null,
      action,
      entity,
      entityId || null,
      JSON.stringify(details),
      req.ip || null,
      new Date().toISOString()
    );
  } catch (e) {
    console.error('audit log failed:', e.message);
  }
}

module.exports = { audit };
