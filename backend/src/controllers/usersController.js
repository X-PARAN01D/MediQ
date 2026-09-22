'use strict';

/** Users controller: admin staff-account management. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginated } = require('../utils/response');
const service = require('../services/usersService');

const list = asyncHandler(async (req, res) => {
  const result = service.list(req.query, req);
  return paginated(res, result.items, result.page, result.limit, result.total);
});

const createStaff = asyncHandler(async (req, res) => {
  const result = await service.createStaff(req.body, req);
  return created(res, result);
});

module.exports = { list, createStaff };
