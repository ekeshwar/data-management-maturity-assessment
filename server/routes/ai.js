'use strict';
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { suggestRules } = require('../utils/aiRules');

// POST /api/ai/suggest-rules
router.post('/suggest-rules', auth, async (req, res) => {
  const { columns, sampleRows } = req.body;
  if (!Array.isArray(columns) || !Array.isArray(sampleRows)) {
    return res.status(400).json({ error: 'columns and sampleRows must be arrays' });
  }
  try {
    const rules = await suggestRules({ columns, sampleRows });
    res.json({ rules });
  } catch (err) {
    console.error('AI rule suggestion failed:', err.message);
    res.status(500).json({ error: err.message || 'AI suggestion failed' });
  }
});

module.exports = router;
