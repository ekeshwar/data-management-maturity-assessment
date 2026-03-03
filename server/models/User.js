'use strict';
const { query } = require('../db/postgres');

async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ email, name, role = 'maker' }) {
  const { rows } = await query(
    `INSERT INTO users (email, name, role, is_active)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [email, name, role]
  );
  return rows[0];
}

async function setOTP(userId, otpHash, otpExpires) {
  await query(
    'UPDATE users SET otp_hash = $1, otp_expires = $2, updated_at = NOW() WHERE id = $3',
    [otpHash, otpExpires, userId]
  );
}

async function activateWithPassword(userId, passwordHash) {
  await query(
    `UPDATE users
     SET password_hash = $1, is_active = true, otp_hash = NULL, otp_expires = NULL, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, userId]
  );
}

async function listAll() {
  const { rows } = await query(
    'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY id',
    []
  );
  return rows;
}

async function updateRole(userId, role) {
  const { rows } = await query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [role, userId]
  );
  return rows[0];
}

async function updateActive(userId, isActive) {
  const { rows } = await query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, userId]
  );
  return rows[0];
}

async function getAccess(userId) {
  const { rows } = await query(
    'SELECT * FROM user_access WHERE user_id = $1 ORDER BY id',
    [userId]
  );
  return rows;
}

async function grantAccess(userId, clientName, masterName = '*') {
  const { rows } = await query(
    `INSERT INTO user_access (user_id, client_name, master_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, client_name, master_name) DO NOTHING
     RETURNING *`,
    [userId, clientName, masterName]
  );
  return rows[0];
}

async function revokeAccess(accessId, userId) {
  await query(
    'DELETE FROM user_access WHERE id = $1 AND user_id = $2',
    [accessId, userId]
  );
}

module.exports = {
  findByEmail,
  findById,
  create,
  setOTP,
  activateWithPassword,
  listAll,
  updateRole,
  updateActive,
  getAccess,
  grantAccess,
  revokeAccess,
};
