-- ============================================================================
-- Arogya Seva Maharashtra — Database Schema (SQLite)
-- Problem Statement ID 26133: Accessibility & quality of public healthcare
-- in rural / underserved areas of Maharashtra.
--
-- Design notes:
-- * All primary keys are TEXT UUIDs generated in the application layer.
-- * Timestamps are ISO-8601 UTC strings (TEXT), written by the app.
-- * JSON columns are TEXT holding stringified JSON (SQLite has no JSONB).
-- * `updated_at` doubles as the sync watermark for the offline-sync endpoint:
--   rows whose server `updated_at` is newer than the client's base timestamp
--   are reported as conflicts.
-- * Foreign keys are enforced (PRAGMA foreign_keys = ON in database.js).
-- ============================================================================

PRAGMA journal_mode = WAL;

-- --------------------------------------------------------------------------
-- Facilities: sub-centres, PHCs, rural hospitals, district hospitals
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facilities (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('sub_centre','phc','rural_hospital','district_hospital')),
    name        TEXT NOT NULL,
    district    TEXT NOT NULL,
    block       TEXT,
    address     TEXT,
    phone       TEXT,
    latitude    REAL,
    longitude   REAL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(type);

-- --------------------------------------------------------------------------
-- Users: every role of the platform (staff + patients with login)
-- Roles: patient, asha_worker, doctor, specialist, lab_tech, pharmacist,
--        facility_admin, system_admin
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                TEXT PRIMARY KEY,
    role              TEXT NOT NULL CHECK (role IN ('patient','asha_worker','doctor','specialist','lab_tech','pharmacist','facility_admin','system_admin')),
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL UNIQUE,
    email             TEXT UNIQUE,
    password_hash     TEXT,
    facility_id       TEXT REFERENCES facilities(id) ON DELETE SET NULL,
    language_pref     TEXT NOT NULL DEFAULT 'mr' CHECK (language_pref IN ('mr','hi','en')),
    is_active         INTEGER NOT NULL DEFAULT 1,
    -- Doctor / clinical staff verification (medical council licence check)
    license_no        TEXT,
    speciality        TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending','verified','rejected')),
    verified_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    verified_at       TEXT,
    verification_notes TEXT,
    -- OTP (demo / passwordless login for patients & field staff)
    otp_code          TEXT,
    otp_expires_at    TEXT,
    -- Refresh-token rotation: only a hash is stored, never the token itself
    refresh_token_hash TEXT,
    last_login_at     TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_facility ON users(facility_id);

-- --------------------------------------------------------------------------
-- Patients: longitudinal identity, independent of login
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id                TEXT PRIMARY KEY,
    user_id           TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    abha_id           TEXT UNIQUE,
    -- ABHA (Ayushman Bharat Health Account) linking state
    abha_link_status  TEXT NOT NULL DEFAULT 'unlinked'
                      CHECK (abha_link_status IN ('unlinked','pending','linked')),
    name              TEXT NOT NULL,
    dob               TEXT,
    gender            TEXT CHECK (gender IN ('male','female','other')),
    phone             TEXT,
    address           TEXT,
    village           TEXT,
    district          TEXT,
    blood_group       TEXT,
    language_pref     TEXT NOT NULL DEFAULT 'mr' CHECK (language_pref IN ('mr','hi','en')),
    emergency_contact TEXT,
    -- High-risk flags drive follow-up scheduling (anc, ncd, tb, elderly...)
    risk_flags        TEXT NOT NULL DEFAULT '[]',
    created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_district ON patients(district);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updated_at);

-- --------------------------------------------------------------------------
-- Appointments: in-person + teleconsult bookings
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id             TEXT PRIMARY KEY,
    patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id    TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    doctor_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    department     TEXT NOT NULL DEFAULT 'general',
    scheduled_date TEXT NOT NULL,            -- YYYY-MM-DD
    scheduled_time TEXT,                     -- HH:MM
    token_number   INTEGER,
    type           TEXT NOT NULL DEFAULT 'in_person' CHECK (type IN ('in_person','teleconsult')),
    priority       TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','emergency')),
    reason         TEXT,
    status         TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','checked_in','in_consultation','completed','cancelled','no_show')),
    created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    UNIQUE (facility_id, scheduled_date, token_number)
);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_facility_date ON appointments(facility_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appt_doctor_date ON appointments(doctor_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appt_updated ON appointments(updated_at);

-- --------------------------------------------------------------------------
-- Queue: daily OPD token queue per facility / department
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS queue_entries (
    id             TEXT PRIMARY KEY,
    facility_id    TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    queue_date     TEXT NOT NULL,             -- YYYY-MM-DD
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    department     TEXT NOT NULL DEFAULT 'general',
    token_number   INTEGER NOT NULL,
    status         TEXT NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting','called','in_service','done','skipped')),
    called_at      TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    UNIQUE (facility_id, queue_date, department, token_number)
);
CREATE INDEX IF NOT EXISTS idx_queue_facility_date ON queue_entries(facility_id, queue_date, status);

-- --------------------------------------------------------------------------
-- Triage: digital triage by ASHA / doctor (vitals + severity)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS triage_assessments (
    id               TEXT PRIMARY KEY,
    patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id      TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    assessed_by      TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    chief_complaint  TEXT NOT NULL,
    symptoms         TEXT NOT NULL DEFAULT '[]',
    vitals           TEXT NOT NULL DEFAULT '{}',
    severity         TEXT NOT NULL CHECK (severity IN ('green','yellow','red')),
    risk_score       INTEGER NOT NULL DEFAULT 0,
    recommended_next TEXT,
    notes            TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_triage_patient ON triage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_facility ON triage_assessments(facility_id);
CREATE INDEX IF NOT EXISTS idx_triage_updated ON triage_assessments(updated_at);

-- --------------------------------------------------------------------------
-- Medical records: longitudinal visit history per patient
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id   TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    doctor_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    visit_date    TEXT NOT NULL,              -- YYYY-MM-DD
    visit_type    TEXT NOT NULL DEFAULT 'opd' CHECK (visit_type IN ('opd','ipd','teleconsult','emergency','camp')),
    diagnosis     TEXT,
    diagnosis_icd TEXT,
    prescriptions TEXT NOT NULL DEFAULT '[]',
    vitals        TEXT NOT NULL DEFAULT '{}',
    notes         TEXT,
    attachments   TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_records_facility ON medical_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_records_updated ON medical_records(updated_at);

-- --------------------------------------------------------------------------
-- Referrals: inter-facility referral tracking with feedback loop
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    id              TEXT PRIMARY KEY,
    patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    from_facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    to_facility_id   TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    referred_by     TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reason          TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','emergency')),
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','completed','cancelled')),
    notes           TEXT,
    feedback        TEXT,
    accepted_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    completed_at    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    CHECK (from_facility_id != to_facility_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_from ON referrals(from_facility_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_to ON referrals(to_facility_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_updated ON referrals(updated_at);

-- --------------------------------------------------------------------------
-- Diagnostic orders: lab test coordination (order -> result)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_orders (
    id           TEXT PRIMARY KEY,
    patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id  TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    ordered_by   TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    test_name    TEXT NOT NULL,
    test_code    TEXT,
    status       TEXT NOT NULL DEFAULT 'ordered'
                 CHECK (status IN ('ordered','sample_collected','in_process','completed','cancelled')),
    result       TEXT,
    result_notes TEXT,
    performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    ordered_at   TEXT NOT NULL,
    completed_at TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diag_patient ON diagnostic_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_diag_facility_status ON diagnostic_orders(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_diag_updated ON diagnostic_orders(updated_at);

-- --------------------------------------------------------------------------
-- Medicines: per-facility drug inventory
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
    id            TEXT PRIMARY KEY,
    facility_id   TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    generic_name  TEXT,
    strength      TEXT,
    form          TEXT,
    quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit          TEXT NOT NULL DEFAULT 'tablet',
    reorder_level INTEGER NOT NULL DEFAULT 50,
    batch_no      TEXT,
    expiry_date   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    UNIQUE (facility_id, name, strength, batch_no)
);
CREATE INDEX IF NOT EXISTS idx_medicines_facility ON medicines(facility_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);

-- --------------------------------------------------------------------------
-- Dispensed medicines: pharmacy dispense log
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispensed_medicines (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medicine_id   TEXT NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    facility_id   TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    record_id     TEXT REFERENCES medical_records(id) ON DELETE SET NULL,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    dosage_note   TEXT,
    dispensed_by  TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    dispensed_at  TEXT NOT NULL,
    created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dispensed_patient ON dispensed_medicines(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensed_facility ON dispensed_medicines(facility_id);

-- --------------------------------------------------------------------------
-- Follow-ups: high-risk / chronic-care follow-up tasks (ASHA-driven)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS followups (
    id          TEXT PRIMARY KEY,
    patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    type        TEXT NOT NULL CHECK (type IN ('anc','pnc','ncd','tb','immunization','post_discharge','general')),
    due_date    TEXT NOT NULL,                -- YYYY-MM-DD
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','done','missed','rescheduled')),
    notes       TEXT,
    outcome     TEXT,
    completed_at TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_followups_assigned ON followups(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_followups_patient ON followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_followups_updated ON followups(updated_at);

-- --------------------------------------------------------------------------
-- Teleconsult sessions: assisted video consultations (ASHA + specialist)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teleconsult_sessions (
    id            TEXT PRIMARY KEY,
    appointment_id TEXT UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id     TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    facility_id   TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    assisted_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','ongoing','completed','cancelled')),
    scheduled_at  TEXT NOT NULL,
    started_at    TEXT,
    ended_at      TEXT,
    -- Call metadata: who consulted whom and for how long
    duration_seconds INTEGER,
    recording_ref TEXT,
    meeting_link  TEXT,
    notes         TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tele_patient ON teleconsult_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_tele_doctor ON teleconsult_sessions(doctor_id, status);

-- --------------------------------------------------------------------------
-- Emergency alerts: escalation from field to facility
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id             TEXT PRIMARY KEY,
    patient_id     TEXT REFERENCES patients(id) ON DELETE SET NULL,
    facility_id    TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    raised_by      TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    severity       TEXT NOT NULL CHECK (severity IN ('moderate','severe','critical')),
    description    TEXT NOT NULL,
    location       TEXT,
    status         TEXT NOT NULL DEFAULT 'raised'
                   CHECK (status IN ('raised','acknowledged','dispatched','resolved')),
    acknowledged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TEXT,
    resolved_at    TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emergency_facility_status ON emergency_alerts(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_created ON emergency_alerts(created_at DESC);

-- --------------------------------------------------------------------------
-- Notifications: in-app alerts (emergency, follow-up due, referral updates)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    entity     TEXT,
    entity_id  TEXT,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- --------------------------------------------------------------------------
-- Audit logs: who did what, when (written by audit middleware/helper)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    details    TEXT NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ABHA link history: every link / unlink event for audit and traceability.
CREATE TABLE IF NOT EXISTS abha_link_history (
    id           TEXT PRIMARY KEY,
    patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    abha_id      TEXT,
    action       TEXT NOT NULL CHECK (action IN ('linked','unlinked')),
    performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_abha_history_patient ON abha_link_history(patient_id);

-- Patient consent records (ABHA / ABDM style): who may access which data,
-- for what purpose, and for how long. Enforced before cross-facility sharing.
CREATE TABLE IF NOT EXISTS consents (
    id               TEXT PRIMARY KEY,
    patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    grantee          TEXT NOT NULL,
    scope            TEXT NOT NULL DEFAULT 'read'
                     CHECK (scope IN ('read','write','share')),
    purpose          TEXT,
    status           TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested','granted','revoked','expired')),
    consent_token_ref TEXT,
    valid_from       TEXT,
    valid_to         TEXT,
    created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    decided_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    decided_at       TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consents_patient ON consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);
