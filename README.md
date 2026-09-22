# Arogya Seva Maharashtra — Integrated Rural Healthcare Access Platform

**Problem Statement ID 26133** · Government of Maharashtra · Maharashtra State Innovation Society
Theme: MedTech / BioTech / HealthTech · Category: Software

A complete, production-ready web application that improves timely access, continuity, quality,
and accountability of public healthcare services in rural and underserved areas of Maharashtra —
strengthening, not replacing, the public-health system.

---

## 1. Problem being solved

Rural communities face long travel distances, specialist shortages, irregular diagnostics,
fragmented medical records, delayed referrals, and limited awareness of available services.
Patients move between sub-centres, PHCs, rural hospitals, and district hospitals with no
continuity of information. Connectivity, language, health literacy, and affordability
further restrict access.

## 2. Features

- **Assisted teleconsultation** — 3-pane session room (patient panel, video placeholder, doctor notes + prescription builder); ASHA worker assists low-literacy patients
- **Appointment & queue management** — booking, confirmation, cancellation, live token numbers with 30s auto-refresh
- **Digital triage** — vitals + 12 symptoms → red/yellow/green priority algorithm; red auto-raises an emergency alert
- **Longitudinal patient records** — unified record across visits with vitals/vitals-chart, visits, and reports tabs
- **Referral tracking** — priority workflow: pending → accepted → completed/rejected with feedback back to the referring facility
- **Diagnostic coordination** — order → sample collection → report-ready workflow
- **Medicine availability** — per-facility inventory, low-stock alerts, transactional dispensing, patient prescriptions
- **High-risk follow-up** — overdue/upcoming/done lists with high-risk badges for ASHA workers
- **Facility & system dashboards** — KPIs, Chart.js bar/doughnut trends, stock alerts, queue snapshot
- **Emergency escalation** — pulsing SOS button → confirm → escalation timeline + tel:108
- **Offline-first** — POST/PUT queue in localStorage, auto-sync on reconnect, backend `/api/sync` bulk upsert with conflict detection
- **Multilingual** — English / Hindi / Marathi UI toggle (102 core keys × 3 languages)
- **ABHA identity linking** — patient ABHA (Ayushman Bharat Health Account) lookup & link/unlink from the patient list; link history is audited
- **Patient consent management** — request / grant / revoke / expire data-sharing consents per patient (read/write/share scopes), recorded per grantee
- **Doctor licence verification** — doctors/specialists register with licence no. + speciality and start `pending`; facility/system admins approve or reject from the admin Verifications tab; unverified doctors cannot start teleconsultations
- **Teleconsult duration** — call duration (mm:ss) computed from start/end timestamps and shown in the session list and room
- **Admin staff onboarding** — admins create staff accounts per facility; a one-time temporary password is returned once by the API and must be changed on first login

## 3. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | Node.js 18+ · Express 4 | Single-language stack, minimal, well-understood |
| Database | SQLite via better-sqlite3 (file, WAL) | Zero-config demo; swap for Postgres in production |
| Auth | JWT access (15m) + rotating refresh (7d, SHA-256 stored, unique jti), bcryptjs | Stateless API, short-lived tokens, hashed secrets |
| Validation | express-validator | Declarative per-route validation |
| Security | helmet, cors, express-rate-limit | Headers, origin control, abuse protection |
| Frontend | Vanilla JS + Tailwind CDN + Chart.js | No build step, responsive, works over plain HTTP |
| i18n | Custom `i18n.js` (EN/HI/MR) | Rural language needs without heavy deps |

## 4. Architecture

```
Browser (hash-routed SPA, offline queue in localStorage)
   │  REST JSON  {success, data, error}
   ▼
Express API ── middleware: rateLimit → helmet/cors → requireAuth(JWT) → authorize(roles) → validate
   │  routes → controllers → services → better-sqlite3
   ▼
SQLite (16 tables) · audit_logs · notifications
```

Frontend falls back to an in-memory demo backend when the API is unreachable, so every
screen works with zero backend (Admin → System tab shows which backend is active).

## 5. Folder structure

```
arogya-seva-mh/
  README.md                  # this file
  .env.example               # all configuration variables
  Dockerfile                 # production container
  docker-compose.yml         # app + volume for sqlite file
  database/
    schema.sql               # 16 tables, indexes, FK constraints
  backend/
    package.json
    .env.example
    src/
      server.js app.js
      config/ db/            # database.js, seed.js
      middleware/            # auth, rbac, validate, errorHandler, rateLimit
      routes/ controllers/ services/   # 16 domains
      utils/                 # AppError, asyncHandler, response, audit, notify, scope
  frontend/
    index.html               # app shell
    css/styles.css           # design system (teal #0d7a6f, saffron accent)
    js/app.js                # router, guards, API client, offline queue, demo backend
    js/i18n.js               # EN/HI/MR strings
    js/components/          # toast, modal, skeleton, empty-state, cards, tables, forms
    js/views/               # 15 views: login, dashboard, patients, appointments,
                            # queue, triage, records, referrals, diagnostics,
                            # pharmacy, followups, teleconsult, emergency,
                            # facility-dashboard, admin
```

## 6. Database setup

SQLite needs no server. On first start the backend loads `database/schema.sql` and runs
`src/db/seed.js` (idempotent demo data: 8 role users, facilities, medicine stock).

For Postgres (multi-instance production): create the DB, port `schema.sql` types
(`INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`, `DATETIME` → `TIMESTAMPTZ`),
and swap `src/db/database.js` for a `pg` pool. All SQL is centralized in `database.js`/`services/`.

## 7. Environment variables

See `.env.example`. Copy to `backend/.env` and set real values. Key variables:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | SQLite file path |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets — **must be long random strings in production** |
| `CORS_ORIGIN` | Allowed frontend origins (comma-separated) |
| `MEET_BASE_URL` | Base URL for teleconsult meeting links |
| `OTP_DEMO_CODE` | Demo OTP returned in dev only |

## 8. API configuration

Base URL: `http://localhost:4000/api`. All responses: `{success: true, data: …}` or
`{success: false, error: {code, message}}`. Auth: `Authorization: Bearer <accessToken>`.
Full endpoint list: §13 below and `backend/README.md`.

## 9. Authentication setup

- **Patients/citizens:** mobile number + OTP (`POST /api/auth/otp/request`, `/verify`). In dev the OTP is returned in the response.
- **Staff (ASHA, doctors, specialists, lab, pharmacy, admins):** mobile + password (`POST /api/auth/login`).
- Access token 15m; refresh rotation at `POST /api/auth/refresh`; logout invalidates refresh token.
- Demo logins: phones `9000000001`–`9000000008` (patient → system_admin), password `Demo@123`.

## 10. Local development setup

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev        # seeds demo DB on first start → http://localhost:4000

# Frontend (separate terminal) — serve over HTTP, not file://
cd ../frontend
python3 -m http.server 5173
# open http://localhost:5173
```

In the app's Admin → System tab (or localStorage key `arogya_backend_url`), point the
frontend at `http://localhost:4000/api` to use the real backend instead of demo mode.

## 11. Running the application

- Dev: `npm run dev` (backend, nodemon) + static server for `frontend/`.
- Prod (single host): `docker compose up --build` → API on 4000; serve `frontend/` via nginx/Caddy with `CORS_ORIGIN` set.

## 12. Testing

- Backend: `npm test` — smoke suite (41 checks: auth, RBAC, appointments, queue, triage→emergency, referrals, dispensing, sync).
- Frontend: `node --check` on all scripts (done during build); manual checklist in `backend/README.md`.

## 13. Key API endpoints

`POST /api/auth/otp/request|verify`, `POST /api/auth/login|refresh|logout`
`GET|POST /api/patients`, `GET|PUT /api/patients/:id`
`GET|POST /api/appointments`, `PATCH /api/appointments/:id`
`GET /api/queue/:facilityId`, `POST /api/queue/token`, `PATCH /api/queue/:id`
`POST /api/triage` (red → auto emergency), `GET /api/triage/:patientId`
`GET|POST /api/records/:patientId`, `POST /api/records/:patientId/visits`
`GET|POST /api/referrals`, `PATCH /api/referrals/:id`
`GET|POST /api/teleconsult`, `PATCH /api/teleconsult/:id`
`POST /api/emergency`, `GET /api/emergency/active`
`GET|POST /api/diagnostics`, `PATCH /api/diagnostics/:id`
`GET /api/pharmacy/stock/:facilityId`, `POST /api/pharmacy/dispense`, `GET /api/pharmacy/prescriptions/:patientId`
`GET|POST /api/followups`, `PATCH /api/followups/:id`
`GET /api/facilities`, `GET /api/dashboard/facility/:id`, `GET /api/dashboard/system`
`GET|PATCH /api/notifications`, `POST /api/sync`

## 14. Deployment

- **Docker:** `docker build -t arogya-seva .` / `docker compose up` (see `docker-compose.yml`).
- **Render/Railway:** use the Dockerfile; attach a persistent volume for the SQLite file or switch to Postgres.
- **Vercel/Netlify:** deploy `frontend/` as a static site; run backend on Render/Railway and set `CORS_ORIGIN`.
- Set `NODE_ENV=production`, strong `JWT_*` secrets, and real `CORS_ORIGIN` before going live.

## 15. Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows demo data | Admin → System tab: set backend URL to `http://<host>:4000/api` |
| 401 on API calls | Access token expired — client auto-refreshes; else re-login |
| 403 for pharmacist dispense | Pharmacists are facility-scoped; system_admin is global |
| better-sqlite3 install fails | Requires Node 18+; package.json pins v13 (has Node 24 prebuilds) |
| OTP not received | Dev returns OTP in response; production needs an SMS gateway (see FINAL CONFIGURATION REQUIRED) |

## 16. Future scalability

Postgres + read replicas, Redis for queue/rate-limit, object storage for diagnostic reports,
WebRTC for real teleconsult video, SMS gateway for OTP/notifications, FHIR export for
ABDM (Ayushman Bharat Digital Mission) integration, analytics warehouse for state dashboards.

---

## 17. ABHA / ABDM integration

`ABHA_PROVIDER` (default `mock`) selects the ABHA registry backend in `backend/src/services/abhaService.js`.

- **mock** — built-in deterministic demo registry. Any phone number resolves to an ABHA ID of the form `ABHA-<digits>`. Link/unlink flows, link history (`abha_link_history`), and consent records all work end-to-end with zero credentials. **Do not use with real patient PII.**
- **abdm** — real ABDM integration. Currently a **stub that returns HTTP 501** (`NOT_IMPLEMENTED`). It is not a live integration.

Exact checklist to go live with ABDM:
1. Register a Health Facility / HIP on the ABDM sandbox; obtain `clientId`/`clientSecret` → `ABDM_CLIENT_ID`, `ABDM_CLIENT_SECRET`, `ABDM_BASE_URL`.
2. Implement session auth: `POST {ABDM_BASE_URL}/v0.5/sessions` → bearer token.
3. Implement ABHA search/verify endpoints and map responses to the `linkConsent()` return shape.
4. Implement consent-manager callbacks for the HIE-CM flow (consent request/on-fetch).
5. Set `ABHA_PROVIDER=abdm` and restart.

### Consent model
Consents live in the `consents` table: one row per (patient, grantee, scope) with lifecycle
`requested → granted → revoked`, plus automatic expiry via `valid_to`. Cross-facility health-record
sharing must call `requireConsent()` before reading another facility's records.

### Doctor licence verification
Doctor/specialist accounts are created `pending` and cannot start teleconsultations until a
facility_admin (same facility) or system_admin approves the licence in Admin → Verifications.
Rejections are recorded with reviewer notes.

---

## FINAL CONFIGURATION REQUIRED

- [ ] `JWT_SECRET` — long random string → `backend/.env`
- [ ] `JWT_REFRESH_SECRET` — different long random string → `backend/.env`
- [ ] `CORS_ORIGIN` — production frontend origin(s) → `backend/.env`
- [ ] `DATABASE_URL` — production DB path/URL → `backend/.env` (SQLite file or Postgres URL after swap)
- [ ] `MEET_BASE_URL` — teleconsult video base URL (or WebRTC provider) → `backend/.env`
- [ ] `SMS_GATEWAY_API_KEY` + `SMS_SENDER_ID` — **not yet wired**: OTP/notifications currently return demo codes; add provider credentials and implement `backend/src/utils/sms.js` → `backend/.env`
- [ ] `STORAGE_URL` + `STORAGE_KEY` — **not yet wired**: diagnostic report file uploads need an object-storage bucket; add credentials → `backend/.env`
- [ ] Frontend backend URL — Admin → System tab in the app, or localStorage `arogya_backend_url`
