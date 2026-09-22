/* Arogya Seva Maharashtra — App core
   Router (hash), Auth (demo JWT in localStorage), Api client (offline queue +
   automatic demo fallback), and the in-memory Demo backend used when no
   real backend is reachable. Plain script — defines window.Views, Api, Auth,
   Router, Demo, App. Loaded LAST after all views/components. */
(function () {
"use strict";

window.Views = window.Views || {};

/* ============================== Demo data ============================== */
function uid(p) { return p + Math.random().toString(36).slice(2, 8).toUpperCase(); }
const todayStr = () => new Date().toISOString().slice(0, 10);

const DemoDB = {
  patients: [
    { id: "P001", name: "Sunita Patil", age: 34, gender: "female", phone: "9822001101", village: "Shirur", bloodGroup: "B+", risk: "high", lastVisit: "2026-09-18" },
    { id: "P002", name: "Ramesh Jadhav", age: 58, gender: "male", phone: "9822001102", village: "Khed", bloodGroup: "O+", risk: "medium", lastVisit: "2026-09-15" },
    { id: "P003", name: "Meena Shinde", age: 26, gender: "female", phone: "9822001103", village: "Junnar", bloodGroup: "A+", risk: "high", lastVisit: "2026-09-20" },
    { id: "P004", name: "Anil Pawar", age: 45, gender: "male", phone: "9822001104", village: "Ambegaon", bloodGroup: "AB+", risk: "low", lastVisit: "2026-09-10" },
    { id: "P005", name: "Kavita More", age: 31, gender: "female", phone: "9822001105", village: "Shirur", bloodGroup: "O-", risk: "medium", lastVisit: "2026-09-21" },
    { id: "P006", name: "Suresh Gaikwad", age: 67, gender: "male", phone: "9822001106", village: "Baramati", bloodGroup: "B-", risk: "high", lastVisit: "2026-09-12" },
    { id: "P007", name: "Priya Deshmukh", age: 22, gender: "female", phone: "9822001107", village: "Khed", bloodGroup: "A-", risk: "low", lastVisit: "2026-09-19" },
    { id: "P008", name: "Vikram Thorat", age: 39, gender: "male", phone: "9822001108", village: "Junnar", bloodGroup: "O+", risk: "low", lastVisit: "2026-09-08" }
  ],
  appointments: [
    { id: "A101", token: 12, patientName: "Sunita Patil", doctorName: "Dr. Patil", date: todayStr(), time: "10:00", reason: "Fever & cough", status: "scheduled" },
    { id: "A102", token: 13, patientName: "Ramesh Jadhav", doctorName: "Dr. Sharma", date: todayStr(), time: "10:20", reason: "BP check", status: "scheduled" },
    { id: "A103", token: 14, patientName: "Meena Shinde", doctorName: "Dr. Patil", date: todayStr(), time: "10:40", reason: "ANC visit", status: "in_progress" },
    { id: "A104", token: 9, patientName: "Anil Pawar", doctorName: "Dr. Jadhav", date: todayStr(), time: "09:00", reason: "Diabetes follow-up", status: "completed" }
  ],
  queue: {
    nowServing: { token: 14, patientName: "Meena Shinde" },
    list: [
      { id: "Q1", token: 14, patientName: "Meena Shinde", status: "in_progress", waitMin: 0 },
      { id: "Q2", token: 15, patientName: "Kavita More", status: "waiting", waitMin: 12 },
      { id: "Q3", token: 16, patientName: "Suresh Gaikwad", status: "waiting", waitMin: 25 },
      { id: "Q4", token: 17, patientName: "Vikram Thorat", status: "waiting", waitMin: 38 }
    ],
    nextToken: 18
  },
  referrals: [
    { id: "R201", patientName: "Suresh Gaikwad", fromFacility: "PHC Shirur", toFacility: "District Hospital", reason: "Chest pain — suspected cardiac", priority: "red", status: "pending", date: "2026-09-21" },
    { id: "R202", patientName: "Meena Shinde", fromFacility: "Sub-centre Khed", toFacility: "Rural Hospital", reason: "High-risk pregnancy", priority: "yellow", status: "accepted", date: "2026-09-20" },
    { id: "R203", patientName: "Ramesh Jadhav", fromFacility: "PHC Junnar", toFacility: "Specialist — Cardiology", reason: "Uncontrolled hypertension", priority: "yellow", status: "completed", date: "2026-09-15" }
  ],
  diagnostics: [
    { id: "D301", patientName: "Sunita Patil", testName: "CBC", testType: "Pathology", status: "report_ready", orderedBy: "Dr. Patil", date: "2026-09-20", result: "Hb 10.2 g/dL — mild anaemia. WBC normal." },
    { id: "D302", patientName: "Anil Pawar", testName: "Blood Sugar", testType: "Pathology", status: "sample_collected", orderedBy: "Dr. Jadhav", date: "2026-09-21", result: "" },
    { id: "D303", patientName: "Suresh Gaikwad", testName: "ECG", testType: "Cardiology", status: "ordered", orderedBy: "Dr. Sharma", date: "2026-09-22", result: "" }
  ],
  medicines: [
    { id: "M401", name: "Paracetamol 500mg", unit: "tablet", stock: 1200, reorderLevel: 300, expiry: "2027-06-01", batch: "PCM26A" },
    { id: "M402", name: "Amoxicillin 250mg", unit: "capsule", stock: 180, reorderLevel: 200, expiry: "2027-01-15", batch: "AMX26B" },
    { id: "M403", name: "Metformin 500mg", unit: "tablet", stock: 640, reorderLevel: 250, expiry: "2027-09-01", batch: "MET26C" },
    { id: "M404", name: "ORS sachet", unit: "sachet", stock: 90, reorderLevel: 150, expiry: "2026-12-01", batch: "ORS26D" },
    { id: "M405", name: "Iron + Folic Acid", unit: "tablet", stock: 820, reorderLevel: 300, expiry: "2027-04-01", batch: "IFA26E" }
  ],
  prescriptions: [
    { id: "RX1", patientName: "Sunita Patil", date: "2026-09-18", items: [{ name: "Paracetamol 500mg", dosage: "1 tab twice daily", days: 3 }], doctor: "Dr. Patil" },
    { id: "RX2", patientName: "Anil Pawar", date: "2026-09-10", items: [{ name: "Metformin 500mg", dosage: "1 tab twice daily", days: 30 }], doctor: "Dr. Jadhav" }
  ],
  followups: [
    { id: "F501", patientName: "Meena Shinde", reason: "ANC — 3rd trimester check", dueDate: "2026-09-20", status: "pending", risk: "high" },
    { id: "F502", patientName: "Anil Pawar", reason: "Diabetes sugar review", dueDate: "2026-09-25", status: "pending", risk: "medium" },
    { id: "F503", patientName: "Suresh Gaikwad", reason: "Post-referral cardiac review", dueDate: "2026-09-28", status: "pending", risk: "high" },
    { id: "F504", patientName: "Sunita Patil", reason: "Anaemia re-check", dueDate: "2026-09-15", status: "done", risk: "medium" }
  ],
  teleconsults: [
    { id: "T601", patientName: "Kavita More", doctorName: "Dr. Sharma", scheduledAt: "2026-09-22T11:00", status: "scheduled", assistedBy: "ASHA — Surekha" },
    { id: "T602", patientName: "Vikram Thorat", doctorName: "Dr. Patil", scheduledAt: "2026-09-21T15:30", status: "completed", assistedBy: "", diagnosis: "Viral fever", notes: "Rest, fluids.", prescription: [{ name: "Paracetamol 500mg", dosage: "1 tab twice daily", days: 3 }] }
  ],
  users: [
    { id: "U1", name: "Dr. Patil", role: "doctor", facility: "PHC Shirur", phone: "9822001201", status: "active" },
    { id: "U2", name: "Surekha Yadav", role: "asha_worker", facility: "Sub-centre Khed", phone: "9822001202", status: "active" },
    { id: "U3", name: "Rahul Nair", role: "lab_tech", facility: "Rural Hospital", phone: "9822001203", status: "active" },
    { id: "U4", name: "Pooja Kulkarni", role: "pharmacist", facility: "PHC Shirur", phone: "9822001204", status: "active" }
  ]
};

function demoRecord(patientId) {
  const p = DemoDB.patients.find(x => x.id === patientId) || DemoDB.patients[0];
  return {
    patient: p,
    visits: [
      { id: "V1", date: "2026-09-18", doctor: "Dr. Patil", diagnosis: "Viral fever", notes: "Fever 3 days, advised rest and fluids.", prescription: "Paracetamol 500mg — 1 tab twice daily × 3 days" },
      { id: "V2", date: "2026-08-30", doctor: "Dr. Sharma", diagnosis: "Anaemia", notes: "Hb 10.2, started IFA.", prescription: "Iron + Folic Acid — 1 tab daily × 30 days" }
    ],
    vitals: [
      { date: "2026-08-30", temp: 37.1, sysBp: 118, diaBp: 76, pulse: 82, spo2: 98 },
      { date: "2026-09-18", temp: 38.6, sysBp: 122, diaBp: 80, pulse: 96, spo2: 97 }
    ],
    reports: [{ id: "RP1", name: "CBC Report.pdf", date: "2026-09-20", size: "184 KB" }]
  };
}

function demoDashboard(role) {
  const base = [
    { label: "Patients today", value: 42, sub: "+6 vs yesterday", icon: "🧑‍🤝‍🧑", tone: "teal" },
    { label: "Appointments today", value: 28, sub: "6 completed", icon: "📅", tone: "blue" },
    { label: "Active referrals", value: 7, sub: "2 critical", icon: "🔁", tone: "amber" },
    { label: "Critical triage (7d)", value: 5, sub: "all escalated", icon: "🚨", tone: "red" }
  ];
  if (role === "pharmacist") base.push({ label: "Low stock items", value: 2, sub: "reorder soon", icon: "💊", tone: "amber" });
  if (role === "lab_tech") base.push({ label: "Tests pending", value: 4, sub: "2 samples collected", icon: "🧪", tone: "blue" });
  if (role === "patient") return { stats: [
    { label: "Upcoming appointments", value: 1, sub: "Today 10:00", icon: "📅", tone: "teal" },
    { label: "Active prescriptions", value: 1, sub: "Paracetamol course", icon: "💊", tone: "blue" },
    { label: "Pending follow-ups", value: 0, sub: "all clear", icon: "🔔", tone: "green" }
  ], trend: null, alerts: [] };
  const days = []; const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("en-IN", { weekday: "short" }));
    data.push(18 + ((i * 7) % 15));
  }
  return {
    stats: base,
    trend: { labels: days, data: data, label: "Appointments" },
    alerts: [
      { tone: "red", text: "2 critical triage cases need referral follow-up" },
      { tone: "amber", text: "ORS sachets below reorder level at PHC Shirur" }
    ]
  };
}

/* Demo API responder — mirrors the real backend contract */
const Demo = {
  respond: function (method, rawPath, body) {
    const parts = rawPath.split("?");
    const path = parts[0];
    const q = {};
    if (parts[1]) new URLSearchParams(parts[1]).forEach((v, k) => { q[k] = v; });
    const seg = path.split("/").filter(Boolean);
    body = body || {};

    // Patients
    if (seg[0] === "patients" && method === "GET" && seg.length === 1) {
      const term = (q.q || "").toLowerCase();
      return DemoDB.patients.filter(p => !term || p.name.toLowerCase().includes(term) || p.village.toLowerCase().includes(term) || p.id.toLowerCase().includes(term));
    }
    if (seg[0] === "patients" && method === "POST" && seg.length === 1) {
      const p = Object.assign({ id: uid("P"), risk: "low", lastVisit: todayStr() }, body);
      DemoDB.patients.push(p); return p;
    }
    if (seg[0] === "patients" && seg[2] === "record" && method === "GET") return demoRecord(seg[1]);
    if (seg[0] === "patients" && seg[2] === "visits" && method === "POST") {
      return Object.assign({ id: uid("V"), date: todayStr() }, body);
    }
    // Dashboard
    if (path === "/dashboard/summary" && method === "GET") return demoDashboard(q.role || "doctor");
    // Appointments
    if (seg[0] === "appointments" && method === "GET" && seg.length === 1) {
      return DemoDB.appointments.filter(a =>
        (!q.date || a.date === q.date) && (!q.status || q.status === "all" || a.status === q.status));
    }
    if (seg[0] === "appointments" && method === "POST") {
      const a = Object.assign({ id: uid("A"), token: 20 + DemoDB.appointments.length, status: "scheduled" }, body);
      DemoDB.appointments.push(a); return a;
    }
    if (seg[0] === "appointments" && seg.length === 2 && method === "PUT") {
      const a = DemoDB.appointments.find(x => x.id === seg[1]);
      if (a) Object.assign(a, body); return a || { ok: false };
    }
    // Queue
    if (path === "/queue" && method === "GET") return DemoDB.queue;
    if (path === "/queue" && method === "POST") {
      const t = DemoDB.queue.nextToken++;
      const e = { id: uid("Q"), token: t, patientName: body.patientName || "Walk-in", status: "waiting", waitMin: DemoDB.queue.list.length * 12 };
      DemoDB.queue.list.push(e); return e;
    }
    if (path === "/queue/next" && method === "PUT") {
      const cur = DemoDB.queue.list.find(x => x.status === "in_progress");
      if (cur) cur.status = "done";
      const nxt = DemoDB.queue.list.find(x => x.status === "waiting");
      if (nxt) { nxt.status = "in_progress"; nxt.waitMin = 0; DemoDB.queue.nowServing = { token: nxt.token, patientName: nxt.patientName }; }
      return DemoDB.queue;
    }
    // Triage
    if (path === "/triage" && method === "POST") return { ok: true, id: uid("TR"), saved: true };
    // Referrals
    if (seg[0] === "referrals" && method === "GET" && seg.length === 1)
      return DemoDB.referrals.filter(r => !q.status || q.status === "all" || r.status === q.status);
    if (seg[0] === "referrals" && method === "POST") {
      const r = Object.assign({ id: uid("R"), status: "pending", date: todayStr(), fromFacility: "PHC Shirur" }, body);
      DemoDB.referrals.push(r); return r;
    }
    if (seg[0] === "referrals" && seg.length === 2 && method === "PUT") {
      const r = DemoDB.referrals.find(x => x.id === seg[1]);
      if (r) Object.assign(r, body); return r || { ok: false };
    }
    // Diagnostics
    if (seg[0] === "diagnostics" && method === "GET" && seg.length === 1) return DemoDB.diagnostics;
    if (seg[0] === "diagnostics" && method === "POST") {
      const d = Object.assign({ id: uid("D"), status: "ordered", date: todayStr() }, body);
      DemoDB.diagnostics.push(d); return d;
    }
    if (seg[0] === "diagnostics" && seg.length === 2 && method === "PUT") {
      const d = DemoDB.diagnostics.find(x => x.id === seg[1]);
      if (d) Object.assign(d, body); return d || { ok: false };
    }
    // Pharmacy
    if (path === "/medicines" && method === "GET") return DemoDB.medicines;
    if (seg[0] === "medicines" && seg.length === 2 && method === "PUT") {
      const m = DemoDB.medicines.find(x => x.id === seg[1]);
      if (m) Object.assign(m, body); return m || { ok: false };
    }
    if (path === "/pharmacy/dispense" && method === "POST") {
      const m = DemoDB.medicines.find(x => x.id === body.medicineId);
      if (m) m.stock = Math.max(0, m.stock - (parseInt(body.qty, 10) || 0));
      return { ok: true, dispensed: body };
    }
    if (path === "/pharmacy/prescriptions" && method === "GET") {
      const term = (q.patient || "").toLowerCase();
      return DemoDB.prescriptions.filter(p => !term || p.patientName.toLowerCase().includes(term));
    }
    // Follow-ups
    if (seg[0] === "followups" && method === "GET" && seg.length === 1) return DemoDB.followups;
    if (seg[0] === "followups" && method === "POST") {
      const f = Object.assign({ id: uid("F"), status: "pending" }, body);
      DemoDB.followups.push(f); return f;
    }
    if (seg[0] === "followups" && seg.length === 2 && method === "PUT") {
      const f = DemoDB.followups.find(x => x.id === seg[1]);
      if (f) Object.assign(f, body); return f || { ok: false };
    }
    // Teleconsult
    if (seg[0] === "teleconsults" && method === "GET" && seg.length === 1) return DemoDB.teleconsults;
    if (seg[0] === "teleconsults" && method === "POST") {
      const t = Object.assign({ id: uid("T"), status: "scheduled" }, body);
      DemoDB.teleconsults.push(t); return t;
    }
    if (seg[0] === "teleconsults" && seg.length === 2 && method === "PUT") {
      const t = DemoDB.teleconsults.find(x => x.id === seg[1]);
      if (t) Object.assign(t, body); return t || { ok: false };
    }
    // Emergency
    if (path === "/emergency" && method === "POST") return { ok: true, id: uid("E"), eta: "~25 min", facility: "PHC Shirur" };
    // Facility stats
    if (path === "/facility/stats" && method === "GET") {
      return {
        kpis: { patientsToday: 42, appointmentsToday: 28, activeReferrals: 7, criticalCases: 2, lowStock: 2, queueLength: DemoDB.queue.list.filter(x => x.status === "waiting").length },
        appointmentsByDay: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], data: [22, 31, 28, 35, 29, 18] },
        referralsByStatus: { labels: ["Pending", "Accepted", "Completed"], data: [3, 2, 5] },
        stockAlerts: DemoDB.medicines.filter(m => m.stock <= m.reorderLevel),
        queueNow: DemoDB.queue.nowServing
      };
    }
    // Users
    if (seg[0] === "users" && method === "GET" && seg.length === 1) return DemoDB.users;
    if (seg[0] === "users" && method === "POST") {
      const u = Object.assign({ id: uid("U"), status: "active" }, body);
      DemoDB.users.push(u); return u;
    }
    if (seg[0] === "users" && seg.length === 2 && (method === "PUT" || method === "DELETE")) {
      const i = DemoDB.users.findIndex(x => x.id === seg[1]);
      if (method === "DELETE") { if (i > -1) DemoDB.users.splice(i, 1); return { ok: true }; }
      if (i > -1) Object.assign(DemoDB.users[i], body);
      return DemoDB.users[i] || { ok: false };
    }
    return { ok: true, demo: true, note: "Demo response for " + method + " " + path };
  }
};
window.Demo = Demo;

/* ============================== API client ============================== */
const QUEUE_KEY = "arogya_queue";
const _statusCbs = [];

function getQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (e) { return []; } }
function setQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {} }
function notifyStatus() { _statusCbs.forEach(cb => { try { cb({ online: navigator.onLine, demoMode: Api.demoMode, pending: getQueue().length }); } catch (e) {} }); }
function setDemoMode(v) { if (Api.demoMode !== v) { Api.demoMode = v; notifyStatus(); } }

function fetchTimeout(url, opts, ms) {
  ms = ms || 9000;
  return Promise.race([
    fetch(url, opts),
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, ms); })
  ]);
}

const Api = {
  baseUrl: localStorage.getItem("arogya_backend_url") || "http://localhost:4000/api",
  demoMode: false,
  onStatusChange: function (cb) { _statusCbs.push(cb); },

  setBaseUrl: function (url) {
    Api.baseUrl = (url || "").replace(/\/$/, "");
    try { localStorage.setItem("arogya_backend_url", Api.baseUrl); } catch (e) {}
    notifyStatus();
  },
  clearQueue: function () { setQueue([]); notifyStatus(); },

  request: async function (method, path, body) {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].indexOf(method) !== -1;
    if (mutating && !navigator.onLine) {
      const q = getQueue();
      q.push({ method: method, path: path, body: body || null, ts: Date.now() });
      setQueue(q); notifyStatus();
      return { queued: true, offline: true };
    }
    try {
      const headers = { "Content-Type": "application/json" };
      const tok = Auth.token();
      if (tok) headers["Authorization"] = "Bearer " + tok;
      const res = await fetchTimeout(Api.baseUrl + path, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setDemoMode(false);
      const txt = await res.text();
      return txt ? JSON.parse(txt) : { ok: true };
    } catch (e) {
      // Backend unreachable → transparent demo fallback so the UI stays usable
      setDemoMode(true);
      return Demo.respond(method, path, body);
    }
  },
  get: function (p) { return Api.request("GET", p); },
  post: function (p, b) { return Api.request("POST", p, b); },
  put: function (p, b) { return Api.request("PUT", p, b); },
  patch: function (p, b) { return Api.request("PATCH", p, b); },
  del: function (p) { return Api.request("DELETE", p); },

  syncQueue: async function () {
    const q = getQueue();
    if (!q.length || !navigator.onLine) return;
    let done = 0;
    const remaining = [];
    for (const item of q) {
      try {
        const headers = { "Content-Type": "application/json" };
        const tok = Auth.token();
        if (tok) headers["Authorization"] = "Bearer " + tok;
        const res = await fetchTimeout(Api.baseUrl + item.path, {
          method: item.method, headers: headers,
          body: item.body ? JSON.stringify(item.body) : undefined
        }, 8000);
        if (res.ok) done++; else remaining.push(item);
      } catch (e) { remaining.push(item); }
    }
    setQueue(remaining); notifyStatus();
    if (done > 0 && window.Toast) Toast.success(I18n.t("sync_done") + " (" + done + ")");
  }
};
window.Api = Api;

/* ============================== Auth ============================== */
const Auth = {
  user: function () { try { return JSON.parse(localStorage.getItem("arogya_user") || "null"); } catch (e) { return null; } },
  token: function () { return localStorage.getItem("arogya_token"); },
  isLoggedIn: function () { return !!Auth.token(); },
  login: function (role, name) {
    const u = { name: name || "Demo User", role: role };
    const tok = btoa(JSON.stringify({ name: u.name, role: u.role, iat: Date.now() })) + ".demo";
    try {
      localStorage.setItem("arogya_token", tok);
      localStorage.setItem("arogya_user", JSON.stringify(u));
    } catch (e) {}
    return u;
  },
  logout: function () {
    try { localStorage.removeItem("arogya_token"); localStorage.removeItem("arogya_user"); } catch (e) {}
    Router.go("#/login");
  },
  can: function () {
    const u = Auth.user();
    if (!u) return false;
    return Array.prototype.indexOf.call(arguments, u.role) !== -1;
  }
};
window.Auth = Auth;

/* ============================== Router ============================== */
const ALL_ROLES = ["patient", "asha_worker", "doctor", "specialist", "lab_tech", "pharmacist", "facility_admin", "system_admin"];
const ROUTES = [
  { path: "login", view: "login", public: true },
  { path: "dashboard", view: "dashboard", roles: ALL_ROLES },
  { path: "patients", view: "patients", roles: ["asha_worker", "doctor", "specialist", "facility_admin", "system_admin"] },
  { path: "appointments", view: "appointments", roles: ["patient", "asha_worker", "doctor", "facility_admin", "system_admin"] },
  { path: "queue", view: "queue", roles: ["patient", "asha_worker", "doctor", "facility_admin", "system_admin"] },
  { path: "triage", view: "triage", roles: ["asha_worker", "doctor"] },
  { path: "records", view: "records", roles: ["patient", "asha_worker", "doctor", "specialist"] },
  { path: "referrals", view: "referrals", roles: ["asha_worker", "doctor", "specialist", "facility_admin", "system_admin"] },
  { path: "diagnostics", view: "diagnostics", roles: ["asha_worker", "doctor", "lab_tech", "facility_admin", "system_admin"] },
  { path: "pharmacy", view: "pharmacy", roles: ["patient", "doctor", "pharmacist", "facility_admin", "system_admin"] },
  { path: "followups", view: "followups", roles: ["asha_worker", "doctor", "facility_admin"] },
  { path: "teleconsult", view: "teleconsult", roles: ["patient", "asha_worker", "doctor", "specialist"] },
  { path: "emergency", view: "emergency", roles: ALL_ROLES },
  { path: "facility", view: "facility-dashboard", roles: ["doctor", "facility_admin", "system_admin"] },
  { path: "admin", view: "admin", roles: ["facility_admin", "system_admin"] }
];
const NAV_ICONS = {
  dashboard: "📊", patients: "🧑‍🤝‍🧑", appointments: "📅", queue: "🔢", triage: "🩺",
  records: "📁", referrals: "🔁", diagnostics: "🧪", pharmacy: "💊", followups: "🔔",
  teleconsult: "📹", emergency: "🆘", facility: "🏥", admin: "⚙️"
};

let _cleanup = null;
const Router = {
  routes: ROUTES,
  go: function (hash) { if (location.hash === hash) Router.render(); else location.hash = hash; },
  params: function () {
    const h = location.hash || "";
    const qi = h.indexOf("?");
    const out = {};
    if (qi !== -1) new URLSearchParams(h.slice(qi + 1)).forEach((v, k) => { out[k] = v; });
    return out;
  },
  path: function () {
    const h = (location.hash || "#/dashboard").replace(/^#\//, "");
    const qi = h.indexOf("?");
    return qi === -1 ? h : h.slice(0, qi);
  },
  start: function () {
    window.addEventListener("hashchange", Router.render);
    Router.render();
  },
  rerender: function () { Router.render(); },
  render: async function () {
    if (_cleanup) { try { const c = _cleanup; _cleanup = null; await c(); } catch (e) {} }
    const path = Router.path() || "dashboard";
    const route = ROUTES.find(r => r.path === path);
    const root = document.getElementById("app-root");
    if (!root) return;

    if (!route) { Router.go("#/dashboard"); return; }
    if (!route.public && !Auth.isLoggedIn()) { Router.go("#/login"); return; }
    if (route.public && Auth.isLoggedIn() && path === "login") { Router.go("#/dashboard"); return; }
    if (route.roles && !Auth.can.apply(Auth, route.roles)) {
      if (window.Toast) Toast.error(I18n.t("access_denied"));
      Router.go("#/dashboard"); return;
    }
    App.renderChrome(path);
    const fn = Views[route.view];
    if (typeof fn !== "function") {
      root.innerHTML = '<div class="card card-pad"><p>' + I18n.t("error_load") + '</p></div>';
      return;
    }
    try {
      const maybeCleanup = await fn(root);
      if (typeof maybeCleanup === "function") _cleanup = maybeCleanup;
    } catch (e) {
      console.error("View error:", e);
      root.innerHTML = '<div class="card card-pad"><p class="font-bold text-red-700">' + I18n.t("error_load") +
        '</p><p class="text-sm text-slate-500 mt-1">' + String((e && e.message) || e) +
        '</p><button class="btn btn-primary btn-sm mt-3" onclick="Router.rerender()">' + I18n.t("try_again") + "</button></div>";
    }
    const sb = document.getElementById("sidebar");
    if (sb) sb.classList.remove("open");
    const ov = document.getElementById("sidebar-overlay");
    if (ov) ov.classList.remove("open");
    window.scrollTo(0, 0);
  }
};
window.Router = Router;

/* ============================== App shell ============================== */
const App = {
  applyI18n: function () {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = I18n.t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", I18n.t(el.getAttribute("data-i18n-ph")));
    });
  },

  navForRole: function (role) {
    return ROUTES.filter(r => !r.public && (!r.roles || r.roles.indexOf(role) !== -1));
  },

  renderChrome: function (activePath) {
    const u = Auth.user();
    const guest = !u;
    document.body.classList.toggle("is-guest", guest);
    const sidebar = document.getElementById("sidebar");
    const topbar = document.getElementById("topbar");
    if (sidebar) sidebar.style.display = guest ? "none" : "";
    if (topbar) topbar.querySelector(".user-area").style.display = guest ? "none" : "";

    // Language buttons
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.lang === I18n.lang);
    });

    // Sidebar nav
    const nav = document.getElementById("side-nav");
    if (nav && u) {
      nav.innerHTML = App.navForRole(u.role).map(function (r) {
        const active = r.path === activePath ? " active" : "";
        return '<a href="#/' + r.path + '" class="sidebar-link' + active + '">' +
          '<span class="ico">' + (NAV_ICONS[r.path] || "•") + "</span>" +
          "<span>" + I18n.t(r.path) + "</span></a>";
      }).join("");
    }

    // User chip
    const chip = document.getElementById("user-chip");
    if (chip && u) {
      chip.innerHTML = '<span class="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-extrabold">' +
        String(u.name || "U").charAt(0).toUpperCase() + "</span>" +
        '<span class="hidden sm:block text-left leading-tight"><span class="block text-sm font-bold">' +
        String(u.name || "").replace(/</g, "&lt;") + '</span><span class="block text-xs opacity-80">' +
        I18n.t("role_" + u.role) + "</span></span>";
    }
    App.applyI18n();
    App.updateBanners();
  },

  updateBanners: function () {
    const demo = document.getElementById("demo-banner");
    const off = document.getElementById("offline-banner");
    if (demo) {
      demo.style.display = Api.demoMode && Auth.isLoggedIn() ? "" : "none";
      const q = getQueue().length;
      demo.innerHTML = "⚠️ <strong>" + I18n.t("demo_mode") + "</strong> — " + I18n.t("demo_notice") +
        (q ? ' <span class="badge badge-yellow">' + q + " queued</span>" : "");
    }
    if (off) off.style.display = navigator.onLine ? "none" : "";
  },

  init: function () {
    document.documentElement.lang = I18n.lang;
    // Hamburger
    const ham = document.getElementById("hamburger");
    if (ham) ham.addEventListener("click", function () {
      document.getElementById("sidebar").classList.toggle("open");
      document.getElementById("sidebar-overlay").classList.toggle("open");
    });
    const ov = document.getElementById("sidebar-overlay");
    if (ov) ov.addEventListener("click", function () {
      document.getElementById("sidebar").classList.remove("open");
      ov.classList.remove("open");
    });
    // Language switcher
    document.querySelectorAll(".lang-btn").forEach(function (b) {
      b.addEventListener("click", function () { I18n.setLang(b.dataset.lang); });
    });
    // Logout
    const lo = document.getElementById("logout-btn");
    if (lo) lo.addEventListener("click", function () { Auth.logout(); });
    // Backend URL quick-set from banner? (admin view handles full config)

    window.addEventListener("arogya:lang", function () { App.renderChrome(Router.path()); Router.rerender(); });
    window.addEventListener("online", function () { if (window.Toast) Toast.success(I18n.t("back_online")); Api.syncQueue(); App.updateBanners(); });
    window.addEventListener("offline", function () { App.updateBanners(); });
    Api.onStatusChange(function () { App.updateBanners(); });

    if (!location.hash) location.hash = Auth.isLoggedIn() ? "#/dashboard" : "#/login";
    Router.start();
  }
};
window.App = App;

document.addEventListener("DOMContentLoaded", function () { App.init(); });
})();
