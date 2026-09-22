'use strict';

/**
 * SQLite database singleton (better-sqlite3).
 *
 * Zero-config demo: the schema is loaded from the project SQL file on first
 * start. Resolution order:
 *   1. ../../database/schema.sql  (relative to backend/, per spec)
 *   2. ../database/schema.sql      (relative to backend/, project-root layout)
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

function resolveDbPath() {
  const raw = config.dbUrl;
  return path.isAbsolute(raw)
    ? raw
    : path.resolve(__dirname, '..', '..', raw);
}

function findSchemaFile() {
  const candidates = [
    // ../../database/schema.sql relative to backend/
    path.resolve(__dirname, '..', '..', '..', '..', 'database', 'schema.sql'),
    // ../database/schema.sql relative to backend/ (arogya-seva-mh/database/)
    path.resolve(__dirname, '..', '..', '..', 'database', 'schema.sql'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Database schema not found. Checked: ${candidates.join(', ')}`
  );
}

let db = null;

function initDatabase() {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const schema = fs.readFileSync(findSchemaFile(), 'utf8');
  db.exec(schema);
  return db;
}

function getDb() {
  if (!db) return initDatabase();
  return db;
}

module.exports = getDb();
module.exports.initDatabase = initDatabase;
module.exports.getDb = getDb;
