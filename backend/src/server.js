'use strict';

/** Server entry: loads config, initializes DB, seeds demo data, listens. */
require('dotenv').config();

const config = require('./config');

// Initialize database (loads schema from ../../database/schema.sql)
require('./db/database');

const { ensureSeeded } = require('./db/seed');
ensureSeeded();

const app = require('./app');

app.listen(config.port, () => {
  console.log(`Arogya Seva MH API listening on port ${config.port} (${config.env})`);
});
