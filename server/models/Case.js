'use strict';
const { query } = require('../db/postgres');

async function create({ name, entity_type, userId }) {
  const res = await query(
    `INSERT INTO gr_cases (name, entity_type, created_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, entity_type || 'Generic', userId]
  );
  return res.rows[0];
}

async function addRecords(caseId, records) {
  if (!records || records.length === 0) return;
  const values = [];
  const params = [];
  records.forEach((r, i) => {
    const base = i * 4;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
    params.push(caseId, r.source_name || `Source ${i + 1}`, JSON.stringify(r.data), i);
  });
  await query(
    `INSERT INTO gr_records (case_id, source_name, data, row_order) VALUES ${values.join(', ')}`,
    params
  );
}

async function listAll() {
  const res = await query(
    `SELECT
       c.id, c.name, c.entity_type, c.status, c.created_at,
       u.name AS created_by_name,
       (SELECT COUNT(*) FROM gr_records r WHERE r.case_id = c.id) AS record_count,
       p.status AS proposal_status
     FROM gr_cases c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN gr_proposals p ON p.case_id = c.id
     ORDER BY c.created_at DESC`
  );
  return res.rows;
}

async function findById(id) {
  const [caseRes, recordsRes, proposalRes] = await Promise.all([
    query(
      `SELECT c.*, u.name AS created_by_name
       FROM gr_cases c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [id]
    ),
    query(
      `SELECT id, source_name, data, row_order
       FROM gr_records WHERE case_id = $1 ORDER BY row_order`,
      [id]
    ),
    query(
      `SELECT p.*, pu.name AS proposed_by_name, ru.name AS reviewed_by_name
       FROM gr_proposals p
       LEFT JOIN users pu ON pu.id = p.proposed_by
       LEFT JOIN users ru ON ru.id = p.reviewed_by
       WHERE p.case_id = $1`,
      [id]
    ),
  ]);

  if (!caseRes.rows[0]) return null;
  return {
    ...caseRes.rows[0],
    records: recordsRes.rows,
    proposal: proposalRes.rows[0] || null,
  };
}

async function deleteById(id) {
  await query('DELETE FROM gr_cases WHERE id = $1', [id]);
}

async function createProposal({ caseId, proposedBy, goldenData, notes }) {
  await query(
    `INSERT INTO gr_proposals (case_id, proposed_by, golden_data, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (case_id) DO UPDATE
       SET proposed_by = EXCLUDED.proposed_by,
           golden_data = EXCLUDED.golden_data,
           notes = EXCLUDED.notes,
           status = 'pending',
           proposed_at = NOW(),
           reviewed_by = NULL,
           review_notes = NULL,
           reviewed_at = NULL`,
    [caseId, proposedBy, JSON.stringify(goldenData), notes || null]
  );
  await query(
    `UPDATE gr_cases SET status = 'proposed', updated_at = NOW() WHERE id = $1`,
    [caseId]
  );
}

async function reviewProposal({ caseId, reviewedBy, status, reviewNotes }) {
  await query(
    `UPDATE gr_proposals
     SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW()
     WHERE case_id = $4`,
    [status, reviewedBy, reviewNotes || null, caseId]
  );
  await query(
    `UPDATE gr_cases SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, caseId]
  );
}

module.exports = { create, addRecords, listAll, findById, deleteById, createProposal, reviewProposal };
