'use strict';
const express = require('express');
const router = express.Router();

const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.use(authMiddleware);

// POST /api/cases — create case + records (admin, maker)
router.post('/', rbac('admin', 'maker'), async (req, res, next) => {
  try {
    const { name, entity_type, records } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty' });
    }

    const gr = await Case.create({ name, entity_type, userId: req.user.id });
    await Case.addRecords(gr.id, records);

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'create_case', entityType: 'gr_case', entityId: gr.id,
      detail: { name, entity_type, recordCount: records.length }, ip: req.ip,
    });

    res.status(201).json({ case: gr });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases — list all (admin, maker, checker)
router.get('/', rbac('admin', 'maker', 'checker'), async (req, res, next) => {
  try {
    const cases = await Case.listAll();
    res.json({ cases });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id — case detail (admin, maker, checker)
router.get('/:id', rbac('admin', 'maker', 'checker'), async (req, res, next) => {
  try {
    const gr = await Case.findById(parseInt(req.params.id, 10));
    if (!gr) return res.status(404).json({ error: 'Case not found' });
    res.json({ case: gr });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cases/:id — delete case (admin only)
router.delete('/:id', rbac('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gr = await Case.findById(id);
    if (!gr) return res.status(404).json({ error: 'Case not found' });

    await Case.deleteById(id);

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'delete_case', entityType: 'gr_case', entityId: id,
      detail: { name: gr.name }, ip: req.ip,
    });

    res.json({ message: 'Case deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/:id/proposal — submit golden record (admin, maker)
router.post('/:id/proposal', rbac('admin', 'maker'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { golden_data, notes } = req.body;
    if (!golden_data || typeof golden_data !== 'object') {
      return res.status(400).json({ error: 'golden_data object is required' });
    }

    const gr = await Case.findById(id);
    if (!gr) return res.status(404).json({ error: 'Case not found' });
    if (gr.status === 'approved') {
      return res.status(409).json({ error: 'Case is already approved' });
    }

    await Case.createProposal({ caseId: id, proposedBy: req.user.id, goldenData: golden_data, notes });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'submit_proposal', entityType: 'gr_case', entityId: id,
      detail: { notes }, ip: req.ip,
    });

    res.json({ message: 'Proposal submitted' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cases/:id/proposal — approve or reject (admin, checker)
router.patch('/:id/proposal', rbac('admin', 'checker'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const gr = await Case.findById(id);
    if (!gr) return res.status(404).json({ error: 'Case not found' });
    if (gr.status !== 'proposed') {
      return res.status(409).json({ error: 'Case does not have a pending proposal' });
    }

    await Case.reviewProposal({ caseId: id, reviewedBy: req.user.id, status, reviewNotes: review_notes });

    await AuditLog.log({
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      action: 'review_proposal', entityType: 'gr_case', entityId: id,
      detail: { status, review_notes }, ip: req.ip,
    });

    res.json({ message: `Proposal ${status}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id/export — return golden_data for CSV download (admin, maker, checker)
router.get('/:id/export', rbac('admin', 'maker', 'checker'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const gr = await Case.findById(id);
    if (!gr) return res.status(404).json({ error: 'Case not found' });
    if (gr.status !== 'approved') {
      return res.status(409).json({ error: 'Only approved cases can be exported' });
    }
    res.json({ golden_data: gr.proposal.golden_data, name: gr.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
