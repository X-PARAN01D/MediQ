'use strict';

/** Consents controller: thin HTTP layer over consentService. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const service = require('../services/consentService');

const listForPatient = asyncHandler(async (req, res) => {
  return ok(res, service.listForPatient(req.params.patientId, req.user));
});

const request = asyncHandler(async (req, res) => {
  const consent = service.request({ ...req.body, patient_id: req.params.patientId }, req);
  return created(res, consent);
});

const decide = asyncHandler(async (req, res) => {
  const consent = service.decide(req.params.id, req.body.status, req);
  return ok(res, consent);
});

module.exports = { listForPatient, request, decide };
