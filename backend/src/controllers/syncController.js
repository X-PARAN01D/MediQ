'use strict';

/** Sync controller — thin HTTP layer over syncService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const service = require('../services/syncService');

const sync = asyncHandler(async (req, res) => {
  ok(res, service.sync(req));
});

module.exports = { sync };
