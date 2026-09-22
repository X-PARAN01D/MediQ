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
  runMigrations(db);
  return db;
}

/**
 * Idempotent column migrations for databases created before a schema change.
 * CREATE TABLE IF NOT EXISTS covers new tables; this covers new columns on
 * existing tables.
 */
function runMigrations(db) {
  const existingColumns = (table) =>
    new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

  const addColumnIfMissing = (table, column, ddl) => {
    if (!existingColumns(table).has(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  };

  // Doctor verification fields
  addColumnIfMissing('users', 'license_no', 'TEXT');
  addColumnIfMissing('users', 'speciality', 'TEXT');
  addColumnIfMissing(
    'users',
    'verification_status',
    `TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected'))`
  );
  addColumnIfMissing('users', 'verified_by', 'TEXT REFERENCES users(id) ON DELETE SET NULL');
  addColumnIfMissing('users', 'verified_at', 'TEXT');
  addColumnIfMissing('users', 'verification_notes', 'TEXT');

  // ABHA link state on patients
  addColumnIfMissing(
    'patients',
    'abha_link_status',
    `TEXT NOT NULL DEFAULT 'unlinked' CHECK (abha_link_status IN ('unlinked','pending','linked'))`
  );

  // Teleconsult call metadata
  addColumnIfMissing('teleconsult_sessions', 'duration_seconds', 'INTEGER');
  addColumnIfMissing('teleconsult_sessions', 'recording_ref', 'TEXT');
}

function getDb() {
  if (!db) return initDatabase();
  return db;
}

module.exports = getDb();
module.exports.initDatabase = initDatabase;
module.exports.getDb = getDb;
