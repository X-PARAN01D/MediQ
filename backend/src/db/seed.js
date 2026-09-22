'use strict';

/**
 * Demo seed data — idempotent. Seeds 4 facilities, one demo user per role
 * (password: Demo@123), sample patients, medicines and appointments.
 * Run: `npm run seed` or automatically on server start when users table is empty.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');

const DEMO_PASSWORD = 'Demo@123';

function nowIso() {
  return new Date().toISOString();
}
function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ensureSeeded() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) {
    console.log('Seed: users already exist, skipping.');
    return;
  }
  console.log('Seed: creating demo data...');

  const now = nowIso();
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // ---- Facilities ----
  const facilities = [
    { id: crypto.randomUUID(), type: 'sub_centre', name: 'Sub Centre Wadi', district: 'Pune', block: 'Haveli', phone: '9120000001' },
    { id: crypto.randomUUID(), type: 'phc', name: 'PHC Khed', district: 'Pune', block: 'Khed', phone: '9120000002' },
    { id: crypto.randomUUID(), type: 'rural_hospital', name: 'Rural Hospital Baramati', district: 'Pune', block: 'Baramati', phone: '9120000003' },
    { id: crypto.randomUUID(), type: 'district_hospital', name: 'District Hospital Satara', district: 'Satara', block: 'Satara', phone: '9120000004' },
  ];
  const insertFacility = db.prepare(
    `INSERT INTO facilities (id, type, name, district, block, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const f of facilities) insertFacility.run(f.id, f.type, f.name, f.district, f.block, f.phone, now, now);
  const [subCentre, phc, ruralHospital, districtHospital] = facilities;

  // ---- Users (one per role) ----
  const users = [
    { role: 'patient', name: 'Demo Patient', phone: '9000000001', facility_id: null },
    { role: 'asha_worker', name: 'Demo ASHA Worker', phone: '9000000002', facility_id: subCentre.id },
    { role: 'doctor', name: 'Dr. Demo MO', phone: '9000000003', facility_id: phc.id,
      license_no: 'MH-MCI-2015-48210', speciality: 'General Medicine', verification_status: 'verified' },
    { role: 'specialist', name: 'Dr. Demo Specialist', phone: '9000000004', facility_id: districtHospital.id,
      license_no: 'MH-MCI-2012-30987', speciality: 'Pediatrics', verification_status: 'verified' },
    { role: 'lab_tech', name: 'Demo Lab Technician', phone: '9000000005', facility_id: ruralHospital.id },
    { role: 'pharmacist', name: 'Demo Pharmacist', phone: '9000000006', facility_id: phc.id },
    { role: 'facility_admin', name: 'Demo Facility Admin', phone: '9000000007', facility_id: phc.id },
    { role: 'system_admin', name: 'Demo System Admin', phone: '9000000008', facility_id: null },
  ];
  const insertUser = db.prepare(
    `INSERT INTO users (id, role, name, phone, password_hash, facility_id, language_pref,
                        license_no, speciality, verification_status, verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'mr', ?, ?, ?, ?, ?, ?)`
  );
  const userIds = {};
  for (const u of users) {
    const id = crypto.randomUUID();
    insertUser.run(
      id, u.role, u.name, u.phone, passwordHash, u.facility_id,
      u.license_no || null, u.speciality || null,
      u.verification_status || (u.role === 'doctor' || u.role === 'specialist' ? 'pending' : 'verified'),
      u.verification_status === 'verified' ? now : null,
      now, now
    );
    userIds[u.role] = id;
  }

  // ---- Patient profile for demo patient + sample patients ----
  const insertPatient = db.prepare(
    `INSERT INTO patients (id, user_id, name, phone, gender, village, district, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const demoPatientId = crypto.randomUUID();
  insertPatient.run(demoPatientId, userIds.patient, 'Demo Patient', '9000000001', 'female', 'Wadi', 'Pune', userIds.asha_worker, now, now);

  const samplePatients = [
    ['Sunita Pawar', '9111111111', 'female', 'Wadi', 'Pune'],
    ['Ramesh Jadhav', '9222222222', 'male', 'Khed', 'Pune'],
  ];
  const sampleIds = [];
  for (const [name, phone, gender, village, district] of samplePatients) {
    const id = crypto.randomUUID();
    insertPatient.run(id, null, name, phone, gender, village, district, userIds.asha_worker, now, now);
    sampleIds.push(id);
  }

  // ---- Medicines (per-facility stock) ----
  const insertMedicine = db.prepare(
    `INSERT INTO medicines (id, facility_id, name, generic_name, strength, form, quantity, unit, reorder_level, batch_no, expiry_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const meds = [
    [phc.id, 'Paracetamol', 'Paracetamol', '500mg', 'tablet', 500, 'tablet', 100, 'B101', '2027-06-30'],
    [phc.id, 'ORS Powder', 'Oral Rehydration Salts', '200ml', 'sachet', 200, 'sachet', 50, 'B102', '2027-01-31'],
    [phc.id, 'Iron Folic Acid', 'Ferrous Sulphate + Folic Acid', '100mg', 'tablet', 40, 'tablet', 100, 'B103', '2026-12-31'],
    [ruralHospital.id, 'Amoxicillin', 'Amoxicillin', '250mg', 'capsule', 300, 'capsule', 80, 'B201', '2027-03-31'],
    [subCentre.id, 'Paracetamol', 'Paracetamol', '500mg', 'tablet', 150, 'tablet', 60, 'B301', '2027-06-30'],
  ];
  for (const m of meds) insertMedicine.run(crypto.randomUUID(), ...m, now, now);

  // ---- Sample appointments (today) ----
  const today = todayPlus(0);
  const insertAppt = db.prepare(
    `INSERT INTO appointments (id, patient_id, facility_id, doctor_id, department, scheduled_date, scheduled_time, token_number, type, priority, reason, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'general', ?, ?, ?, 'in_person', 'normal', ?, 'scheduled', ?, ?, ?)`
  );
  insertAppt.run(crypto.randomUUID(), sampleIds[0], phc.id, userIds.doctor, today, '10:00', 1, 'Fever and cough', userIds.asha_worker, now, now);
  insertAppt.run(crypto.randomUUID(), sampleIds[1], phc.id, userIds.doctor, today, '10:15', 2, 'Follow-up for hypertension', userIds.asha_worker, now, now);

  // ---- Sample high-risk follow-up ----
  db.prepare(
    `INSERT INTO followups (id, patient_id, facility_id, assigned_to, type, due_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'anc', ?, 'pending', ?, ?, ?)`
  ).run(crypto.randomUUID(), demoPatientId, subCentre.id, userIds.asha_worker, todayPlus(7), 'ANC home visit — 3rd trimester', now, now);

  console.log('Seed: demo data created. Login phones 9000000001..9000000008 / password Demo@123');
}

if (require.main === module) {
  ensureSeeded();
}

module.exports = { ensureSeeded };
