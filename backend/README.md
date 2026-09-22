# Arogya Seva Maharashtra — Backend API

Integrated rural healthcare access platform for Maharashtra (Problem Statement ID 26133):
assisted teleconsultation, appointment & queue management, digital triage,
longitudinal patient records, referral tracking, diagnostic coordination,
medicine availability, high-risk follow-up, facility dashboards, emergency
escalation, and offline-first sync for frontline (ASHA) workers.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 18+ | Single-language stack, easy deployment |
| Framework | Express 4 | Minimal, well-understood routing/middleware |
| Database | SQLite via better-sqlite3 | Zero-config demo; file-based, WAL mode, no server to manage |
| Auth | JWT (access + rotating refresh), bcryptjs | Stateless API auth; short-lived access tokens |
| Validation | express-validator | Declarative per-route input validation |
| Security | helmet, cors, express-rate-limit | Headers, origin control, abuse protection |

## Folder structure

```
backend/
  src/
    server.js            # entry: init DB, seed, listen
    app.js               # express wiring + route mounting
    config/index.js      # env-driven config (no hardcoded secrets)
    db/
      database.js        # better-sqlite3 singleton, schema loader
      seed.js            # idempotent demo seed (8 roles, facilities, stock)
    middleware/
      auth.js            # requireAuth (JWT)
      rbac.js            # authorize(...roles)
      validate.js        # express-validator result handler
      errorHandler.js    # {success,data,error} errors + 404
      rateLimit.js       # global / auth / OTP limiters
    routes/              # one file per domain (validation + RBAC + wiring)
    controllers/         # thin: call service, send envelope
    services/            # business logic, throws AppError
    utils/
      response.js        # ok / created / paginated / fail envelope
      AppError.js        # status-carrying error
      asyncHandler.js    # async wrapper
      audit.js           # audit_logs writer (fire-and-forget)
      notify.js          # in-app notifications
      scope.js           # ownPatientId / scopeFacility data isolation
  data/                  # SQLite file (created on first run, git-ignored)
  .env.example           # all configuration variables
../database/schema.sql   # canonical DDL (loaded on startup)
```

## Setup

```bash
cd backend
cp .env.example .env     # then edit secrets
npm install
npm run dev              # starts on PORT (default 4000), seeds demo data
```

On first start the server:
1. Creates `data/arogya.db` (or `DATABASE_URL`)
2. Loads `../database/schema.sql` (falls back to `../../database/schema.sql`)
3. Seeds demo facilities + 8 users if the users table is empty

## Demo logins

Password for all demo users: `Demo@123`

| Role | Phone |
|---|---|
| patient | 9000000001 |
| asha_worker | 9000000002 |
| doctor (PHC MO) | 9000000003 |
| specialist | 9000000004 |
| lab_tech | 9000000005 |
| pharmacist | 9000000006 |
| facility_admin | 9000000007 |
| system_admin | 9000000008 |

Patients can also use OTP login: `POST /api/auth/otp/request` then
`POST /api/auth/otp/verify` — in non-production the demo code `123456`
is returned in the response.

## API overview

All endpoints return `{ success, data, error }`. Authenticated routes need
`Authorization: Bearer <access_token>`.

### Auth `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | /register | Patient self-registration |
| POST | /login | Phone + password login |
| POST | /otp/request | Request 6-digit OTP (rate-limited) |
| POST | /otp/verify | Verify OTP → tokens |
| POST | /refresh | Rotate refresh token |
| POST | /logout | Revoke refresh token (auth) |
| GET | /me | Current user profile (auth) |

### Care delivery
| Base path | Description |
|---|---|
| `/api/patients` | Patient registry (search, CRUD, `/me`) |
| `/api/appointments` | Booking with auto token numbers, status flow |
| `/api/queue` | Daily OPD token queue, call-next |
| `/api/triage` | Digital triage; `red` severity auto-raises emergency alert |
| `/api/records` | Longitudinal visit records |
| `/api/referrals` | Inter-facility referrals with accept/complete feedback |
| `/api/teleconsult` | Assisted video sessions (ASHA + specialist) |
| `/api/emergency` | Emergency escalation with acknowledge/dispatch/resolve |

### Operations
| Base path | Description |
|---|---|
| `/api/diagnostics` | Lab orders → sample → result workflow |
| `/api/pharmacy` | Per-facility stock, upsert, dispense (transactional), low-stock |
| `/api/followups` | High-risk follow-up tasks, overdue tracking |
| `/api/facilities` | Facility directory (CRUD restricted) |
| `/api/dashboard` | `/facility` and `/system` aggregated dashboards |
| `/api/notifications` | In-app notifications, mark-read |
| `/api/sync` | Offline bulk upsert with conflict detection |

### Offline sync
`POST /api/sync` accepts `{ device_id, last_synced_at, changes: [...] }`
for whitelisted tables (`patients`, `appointments`, `triage_assessments`,
`medical_records`, `referrals`, `followups`). Each change carries
`base_updated_at`; if the server row is newer, a conflict is returned with
both versions instead of overwriting. The response also includes
`server_changes` since `last_synced_at` for pull-sync.

## Environment variables

See `.env.example`. Key variables:

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | SQLite file path (default `./data/arogya.db`) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets (required in production) |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `MEET_BASE_URL` | Base URL for teleconsult meeting links |
| `OTP_DEMO_CODE` | Demo OTP returned when not in production |

## Security notes

- Passwords hashed with bcrypt (10 rounds); OTP compared in constant time.
- Only SHA-256 hashes of refresh tokens are stored; refresh rotates on use.
- RBAC enforced per route; patients see only their own records; staff are
  scoped to their facility (system_admin is global).
- Audit trail in `audit_logs` for all mutations.
- Rate limits: 300 req/15 min global, 30/15 min auth, 10/hour OTP per IP.
- No secrets in code or logs; production hides internal error details.

## Deployment

Any Node.js host works (Render, Railway, Fly.io, VPS):

```bash
npm install --omit=dev
NODE_ENV=production PORT=4000 DATABASE_URL=/data/arogya.db \
  JWT_SECRET=<random> JWT_REFRESH_SECRET=<random> \
  node src/server.js
```

Use a persistent volume for the SQLite file. For multi-instance scale-out,
migrate the schema to Postgres (the SQL is largely portable) and replace
`src/db/database.js` with a `pg` pool — service code uses standard SQL.

## Troubleshooting

- `Database schema not found` — ensure `arogya-seva-mh/database/schema.sql`
  exists relative to `backend/`.
- `better-sqlite3` build fails — install build tools (`build-essential`,
  python3) then `npm rebuild better-sqlite3`.
- Port in use — set `PORT` in `.env`.
