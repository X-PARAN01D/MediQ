'use strict';

/** Diagnostics controller — thin HTTP layer over diagnosticsService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const service = require('../services/diagnosticsService');

const list = asyncHandler(async (req, res) => {
  const { items, page, limit, total } = service.list(req);
  paginated(res, items, page, limit, total);
});

const getById = asyncHandler(async (req, res) => {
  ok(res, service.getById(req));
});

const create = asyncHandler(async (req, res) => {
  created(res, service.create(req));
});

const updateStatus = asyncHandler(async (req, res) => {
  ok(res, service.updateStatus(req));
});

module.exports = { list, getById, create, updateStatus };
