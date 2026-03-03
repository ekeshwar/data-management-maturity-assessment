'use strict';
const { query } = require('../db/postgres');

async function log({ userId, userEmail, userRole, action, entityType, entityId, detail, ip }) {
  await query(
    `INSERT INTO audit_log (user_id, user_email, user_role, action, entity_type, entity_id, detail, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId || null, userEmail || null, userRole || null, action, entityType || null, entityId || null,
     detail ? JSON.stringify(detail) : null, ip || null]
  );
}

module.exports = { log };
