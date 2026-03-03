'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOTP(otp, hash) {
  return bcrypt.compare(otp, hash);
}

module.exports = { generateOTP, hashOTP, verifyOTP };
