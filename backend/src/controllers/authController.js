'use strict';

/** Thin controllers — validation, service call, response envelope. */
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { audit } = require('../utils/audit');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  audit(req, 'register', 'users', data.user.id, { role: 'patient' });
  created(res, data);
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  audit(req, 'login', 'users', data.user.id, {});
  ok(res, data);
});

const requestOtp = asyncHandler(async (req, res) => {
  const data = authService.requestOtp(req.body);
  ok(res, data);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const data = authService.verifyOtp(req.body);
  audit(req, 'otp_login', 'users', data.user.id, {});
  ok(res, data);
});

const refresh = asyncHandler(async (req, res) => {
  const data = authService.refresh({ refreshToken: req.body.refresh_token });
  ok(res, data);
});

const logout = asyncHandler(async (req, res) => {
  const data = authService.logout(req.user.id);
  audit(req, 'logout', 'users', req.user.id, {});
  ok(res, data);
});

const me = asyncHandler(async (req, res) => {
  ok(res, authService.me(req.user.id));
});

module.exports = { register, login, requestOtp, verifyOtp, refresh, logout, me };
