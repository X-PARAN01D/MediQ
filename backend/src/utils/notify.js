'use strict';

/** In-app notification helper (used by emergency alerts, follow-ups, referrals). */
const crypto = require('crypto');

function notify(db, userId, { type, title, body = null, entity = null, entityId = null }) {
  try {
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, entity, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      userId,
      type,
      title,
      body,
      entity,
      entityId,
      new Date().toISOString()
    );
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

/** Notify every active user with one of the given roles at a facility. */
function notifyFacilityRoles(db, facilityId, roles, payload) {
  const users = db
    .prepare(
      `SELECT id FROM users WHERE facility_id = ? AND role IN (${roles.map(() => '?').join(',')}) AND is_active = 1`
    )
    .all(facilityId, ...roles);
  for (const u of users) notify(db, u.id, payload);
}

module.exports = { notify, notifyFacilityRoles };
