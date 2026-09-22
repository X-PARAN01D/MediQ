'use strict';

/**
 * ABHA (Ayushman Bharat Health Account) integration.
 *
 * Two providers behind one interface:
 *  - "mock": a built-in demo registry (deterministic ABHA IDs derived from the
 *    phone number). Perfect for hackathons and offline demos — no network.
 *  - "abdm": the real ABDM sandbox/production APIs. The interface methods are
 *    defined here; wire them to the ABDM gateway endpoints listed in the README
 *    configuration checklist before switching ABHA_PROVIDER=abdm.
 */
const config = require('../config');
const { AppError } = require('../utils/AppError');

/** Deterministic demo ABHA ID so the mock behaves like a real registry. */
function mockAbhaIdFor(phone) {
  const digits = String(phone).replace(/\D/g, '').slice(-10).padStart(10, '0');
  return `ABHA-${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

const mockProvider = {
  name: 'mock',

  /** Look up an ABHA record by phone or ABHA ID. Returns a record or null. */
  async lookup({ phone, abha_id }) {
    if (!phone && !abha_id) throw new AppError(400, 'phone or abha_id is required');
    // In the mock registry every phone number "has" an ABHA ID.
    if (phone) {
      return {
        abha_id: mockAbhaIdFor(phone),
        name: null, // mock does not store demographics
        phone,
        verified: true,
        provider: 'mock',
      };
    }
    return { abha_id, name: null, phone: null, verified: true, provider: 'mock' };
  },

  /** Create (register) an ABHA ID for the given demographics. */
  async create({ name, phone, dob, gender }) {
    if (!name || !phone) throw new AppError(400, 'name and phone are required');
    return {
      abha_id: mockAbhaIdFor(phone),
      name,
      phone,
      dob: dob || null,
      gender: gender || null,
      verified: true,
      provider: 'mock',
    };
  },
};

const abdmProvider = {
  name: 'abdm',

  async lookup() {
    throw new AppError(
      501,
      'ABDM provider is not wired up yet. Complete the ABDM configuration checklist in the README (client ID/secret, gateway URLs, certificates), then implement the lookup call in abhaService.js.'
    );
  },

  async create() {
    throw new AppError(
      501,
      'ABDM provider is not wired up yet. Complete the ABDM configuration checklist in the README, then implement the create call in abhaService.js.'
    );
  },
};

function provider() {
  return config.abha.provider === 'abdm' ? abdmProvider : mockProvider;
}

module.exports = {
  providerName: () => provider().name,
  lookup: (args) => provider().lookup(args),
  create: (args) => provider().create(args),
  mockAbhaIdFor,
};
