'use strict';

/** Dashboard controller — thin HTTP layer over dashboardService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const service = require('../services/dashboardService');

const facility = asyncHandler(async (req, res) => {
  ok(res, service.facilityDashboard(req));
});

const system = asyncHandler(async (req, res) => {
  ok(res, service.systemDashboard());
});

module.exports = { facility, system };
