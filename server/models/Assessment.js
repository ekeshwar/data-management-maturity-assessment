'use strict';
const { query } = require('../db/postgres');

// ── DAMA ──────────────────────────────────────────────────────

async function createDama({ name, clientName, userId, dimensionConfig, scores, enabledIndices, overallScore, maturityLevel }) {
  const res = await query(
    `INSERT INTO dama_assessments
       (name, client_name, created_by, dimension_config, scores, overall_score, maturity_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, clientName, userId || null,
     JSON.stringify(dimensionConfig),
     JSON.stringify({ scores, enabledIndices }),
     overallScore || null, maturityLevel || null]
  );
  return res.rows[0];
}

async function listDama(userId, role) {
  let res;
  if (role === 'admin') {
    res = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM dama_assessments a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    );
  } else {
    res = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM dama_assessments a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.created_by = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );
  }
  return res.rows;
}

async function findDamaById(id) {
  const res = await query(
    `SELECT a.*, u.name AS created_by_name
     FROM dama_assessments a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function deleteDama(id) {
  const res = await query('DELETE FROM dama_assessments WHERE id = $1 RETURNING id', [id]);
  return res.rows[0] || null;
}

// ── DQ ────────────────────────────────────────────────────────

async function createDq({ name, fileName, userId, configuredRules, results, totalRows }) {
  const res = await query(
    `INSERT INTO dq_assessments
       (name, file_name, created_by, configured_rules, results, total_rows)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, fileName || null, userId || null,
     JSON.stringify(configuredRules),
     JSON.stringify(results),
     totalRows || null]
  );
  return res.rows[0];
}

async function listDq(userId, role) {
  let res;
  if (role === 'admin') {
    res = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM dq_assessments a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    );
  } else {
    res = await query(
      `SELECT a.*, u.name AS created_by_name
       FROM dq_assessments a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.created_by = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );
  }
  return res.rows;
}

async function findDqById(id) {
  const res = await query(
    `SELECT a.*, u.name AS created_by_name
     FROM dq_assessments a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function deleteDq(id) {
  const res = await query('DELETE FROM dq_assessments WHERE id = $1 RETURNING id', [id]);
  return res.rows[0] || null;
}

module.exports = { createDama, listDama, findDamaById, deleteDama, createDq, listDq, findDqById, deleteDq };
