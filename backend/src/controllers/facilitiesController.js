'use strict';

/** Facilities controller — thin HTTP layer over facilitiesService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const service = require('../services/facilitiesService');

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

const update = asyncHandler(async (req, res) => {
  ok(res, service.update(req));
});

module.exports = { list, getById, create, update };
