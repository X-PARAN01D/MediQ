'use strict';

/** ABHA controller: thin HTTP layer over abhaService + patientsService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const abhaService = require('../services/abhaService');
const patientsService = require('../services/patientsService');

const lookup = asyncHandler(async (req, res) => {
  const record = await abhaService.lookup(req.body);
  return ok(res, { ...record, _provider: abhaService.providerName() });
});

const link = asyncHandler(async (req, res) => {
  const patient = await patientsService.linkAbha(req.params.id, req.body, req);
  return ok(res, patient);
});

const unlink = asyncHandler(async (req, res) => {
  const patient = await patientsService.unlinkAbha(req.params.id, req);
  return ok(res, patient);
});

const history = asyncHandler(async (req, res) => {
  return ok(res, patientsService.abhaHistory(req.params.id, req.user));
});

module.exports = { lookup, link, unlink, history };
