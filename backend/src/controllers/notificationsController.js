'use strict';

/** Notifications controller — thin HTTP layer over notificationsService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginated } = require('../utils/response');
const service = require('../services/notificationsService');

const list = asyncHandler(async (req, res) => {
  const { items, page, limit, total } = service.list(req);
  paginated(res, items, page, limit, total);
});

const markRead = asyncHandler(async (req, res) => {
  ok(res, service.markRead(req));
});

module.exports = { list, markRead };
