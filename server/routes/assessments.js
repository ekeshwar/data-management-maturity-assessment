'use strict';
const express = require('express');
const router = express.Router();

const Assessment = require('../models/Assessment');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ── DAMA ──────────────────────────────────────────────────────

// GET /api/assessments/dama
router.get('/dama', async (req, res, next) => {
  try {
    const assessments = await Assessment.listDama(req.user.id, req.user.role);
    res.json({ assessments });
  } catch (err) { next(err); }
});

// POST /api/assessments/dama
router.post('/dama', async (req, res, next) => {
  try {
    const { name, client_name, dimension_config, scores, enabled_indices, overall_score, maturity_level } = req.body;
    if (!name || !client_name) return res.status(400).json({ error: 'name and client_name are required' });
    if (!Array.isArray(scores) || !Array.isArray(enabled_indices)) {
      return res.status(400).json({ error: 'scores and enabled_indices must be arrays' });
    }

    const a = await Assessment.createDama({
      name, clientName: client_name, userId: req.user.id,
      dimensionConfig: dimension_config || [],
      scores, enabledIndices: enabled_indices,
      overallScore: overall_score, maturityLevel: maturity_level,
    });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'save_dama_assessment', entityType: 'dama_assessment', entityId: a.id,
      detail: { name, client_name, overall_score, maturity_level }, ip: req.ip,
    });

    res.status(201).json({ assessment: a });
  } catch (err) { next(err); }
});

// GET /api/assessments/dama/:id
router.get('/dama/:id', async (req, res, next) => {
  try {
    const a = await Assessment.findDamaById(parseInt(req.params.id, 10));
    if (!a) return res.status(404).json({ error: 'Assessment not found' });
    if (req.user.role !== 'admin' && a.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    res.json({ assessment: a });
  } catch (err) { next(err); }
});

// DELETE /api/assessments/dama/:id
router.delete('/dama/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const a = await Assessment.findDamaById(id);
    if (!a) return res.status(404).json({ error: 'Assessment not found' });
    if (req.user.role !== 'admin' && a.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    await Assessment.deleteDama(id);

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'delete_dama_assessment', entityType: 'dama_assessment', entityId: id,
      detail: { name: a.name }, ip: req.ip,
    });

    res.json({ message: 'Assessment deleted' });
  } catch (err) { next(err); }
});

// ── DQ ────────────────────────────────────────────────────────

// GET /api/assessments/dq
router.get('/dq', async (req, res, next) => {
  try {
    const assessments = await Assessment.listDq(req.user.id, req.user.role);
    res.json({ assessments });
  } catch (err) { next(err); }
});

// POST /api/assessments/dq
router.post('/dq', async (req, res, next) => {
  try {
    const { name, file_name, configured_rules, results, total_rows } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(configured_rules) || !Array.isArray(results)) {
      return res.status(400).json({ error: 'configured_rules and results must be arrays' });
    }

    const a = await Assessment.createDq({
      name, fileName: file_name, userId: req.user.id,
      configuredRules: configured_rules,
      results, totalRows: total_rows,
    });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'save_dq_assessment', entityType: 'dq_assessment', entityId: a.id,
      detail: { name, file_name, total_rows, rule_count: configured_rules.length }, ip: req.ip,
    });

    res.status(201).json({ assessment: a });
  } catch (err) { next(err); }
});

// GET /api/assessments/dq/:id
router.get('/dq/:id', async (req, res, next) => {
  try {
    const a = await Assessment.findDqById(parseInt(req.params.id, 10));
    if (!a) return res.status(404).json({ error: 'Assessment not found' });
    if (req.user.role !== 'admin' && a.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    res.json({ assessment: a });
  } catch (err) { next(err); }
});

// DELETE /api/assessments/dq/:id
router.delete('/dq/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const a = await Assessment.findDqById(id);
    if (!a) return res.status(404).json({ error: 'Assessment not found' });
    if (req.user.role !== 'admin' && a.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    await Assessment.deleteDq(id);

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'delete_dq_assessment', entityType: 'dq_assessment', entityId: id,
      detail: { name: a.name }, ip: req.ip,
    });

    res.json({ message: 'Assessment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
