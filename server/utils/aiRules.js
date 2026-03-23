'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Ask Claude to suggest DQ rules for the given columns + sample rows.
 * Returns an array of rule objects (without `id` — caller assigns those).
 */
async function suggestRules({ columns, sampleRows }) {
  const sampleJson = JSON.stringify(sampleRows.slice(0, 20), null, 2);

  const prompt = `You are a Data Quality expert. Analyse the dataset columns and sample rows below and suggest a comprehensive set of data quality rules.

COLUMNS: ${JSON.stringify(columns)}

SAMPLE ROWS (up to 20):
${sampleJson}

Output ONLY a JSON array of rule objects — no prose, no markdown fences, just the raw JSON array.

Each rule object must have these fields:
- "dimension": one of "Completeness" | "Uniqueness" | "Standardisation" | "Validation" | "Business Rules"
- "type": one of the types listed below
- "columns": array of column name strings the rule applies to
- "label": short human-readable description of the rule

Rule types and their extra fields:

Completeness:
  { "dimension": "Completeness", "type": "completeness", "columns": ["ColA"], "label": "..." }

Uniqueness:
  { "dimension": "Uniqueness", "type": "exact-dup", "columns": ["ColA","ColB"], "threshold": null, "label": "..." }
  { "dimension": "Uniqueness", "type": "fuzzy-dup", "columns": ["ColA"], "threshold": 85, "label": "..." }
  (threshold for fuzzy-dup must be an integer 70–100)

Standardisation:
  { "dimension": "Standardisation", "type": "no-special-chars", "columns": ["ColA"], "label": "..." }
  { "dimension": "Standardisation", "type": "uppercase", "columns": ["ColA"], "label": "..." }
  { "dimension": "Standardisation", "type": "lowercase", "columns": ["ColA"], "label": "..." }
  { "dimension": "Standardisation", "type": "numeric-only", "columns": ["ColA"], "label": "..." }
  { "dimension": "Standardisation", "type": "date-format", "columns": ["ColA"], "format": "YYYY-MM-DD", "label": "..." }
  { "dimension": "Standardisation", "type": "max-length", "columns": ["ColA"], "max": 50, "label": "..." }
  { "dimension": "Standardisation", "type": "min-length", "columns": ["ColA"], "min": 2, "label": "..." }

Validation:
  { "dimension": "Validation", "type": "allowed-values", "columns": ["ColA"], "values": ["Val1","Val2"], "label": "..." }
  { "dimension": "Validation", "type": "numeric-range", "columns": ["ColA"], "min": 0, "max": 1000000, "label": "..." }
  { "dimension": "Validation", "type": "format-check", "columns": ["ColA"], "format": "email", "label": "..." }
  { "dimension": "Validation", "type": "format-check", "columns": ["ColA"], "format": "pan", "label": "..." }
  { "dimension": "Validation", "type": "format-check", "columns": ["ColA"], "format": "gst", "label": "..." }

Business Rules:
  { "dimension": "Business Rules", "type": "js-expression", "columns": [], "expr": "row.StartDate <= row.EndDate", "label": "..." }
  (expr must be valid JS using row.ColumnName syntax; columns array can be empty)

Guidelines:
- Suggest completeness rules for every important column that should not be null.
- Suggest uniqueness (exact-dup) for ID or key columns.
- Suggest format-check for email, PAN, or GST columns if detected.
- Suggest allowed-values only when sample data shows a clear finite set (≤15 distinct values for a non-numeric column).
- Suggest numeric-range for numeric columns with obvious bounds (e.g. age, amount, percentage).
- Suggest date-format for date columns.
- Suggest at least one business rule if cross-column logic is evident.
- Be conservative — only suggest rules that are clearly justified by the data.
- Do NOT include duplicate rules for the same column+type combination.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  // Strip markdown code fences if the model wrapped the JSON anyway
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

module.exports = { suggestRules };
