'use strict';

/**
 * Notifications domain service — in-app alerts for the logged-in user.
 * Users can list their own notifications and mark them as read.
 */
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
  const where = ['user_id = ?'];
  const params = [req.user.id];

  if (q.unread === true || q.unread === 'true') {
    where.push('is_read = 0');
  }

  const clause = 'WHERE ' + where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS c FROM notifications ${clause}`).get(...params).c;
  const items = db
    .prepare(`SELECT * FROM notifications ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { items, page, limit, total };
}

function markRead(req) {
  const row = db
    .prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!row) throw new AppError(404, 'Notification not found');
  if (!row.is_read) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    audit(req, 'update', 'notifications', req.params.id, { is_read: true });
  }
  return { ...row, is_read: 1 };
}

module.exports = { list, markRead };
