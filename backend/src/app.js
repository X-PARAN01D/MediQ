'use strict';

/** Express app wiring: security, parsing, routes, error handling. */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(morgan(config.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() }, error: null });
});

app.use('/api', apiLimiter);

// ---- Route modules ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/triage', require('./routes/triage'));
app.use('/api/records', require('./routes/records'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/diagnostics', require('./routes/diagnostics'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/facilities', require('./routes/facilities'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/teleconsult', require('./routes/teleconsult'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/abha', require('./routes/abha'));
app.use('/api/consents', require('./routes/consents'));
app.use('/api/verifications', require('./routes/verifications'));
app.use('/api/users', require('./routes/users'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
