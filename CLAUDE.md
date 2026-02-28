# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **single-file static webpage** (`index.html`) — a Data Management Maturity Assessment tool. There is no build system, package manager, or server. Open `index.html` directly in any modern browser.

## Architecture

Everything lives in `index.html` with three embedded sections:

- **`<style>`** — All CSS, including layout, tab bar, pill-style radio buttons, score bar animation, and responsive breakpoints.
- **`<body>`** — Two tab panels (`#panel-governance`, `#panel-quality`), each containing a `<form>` with 7 radio-button questions and a result panel (`#result-*`).
- **`<script>`** — Vanilla JS handling tab switching (`switchTab`), form validation, score calculation (`submitForm`), maturity level lookup (`getLevel`), and bar animation.

### Key conventions

- Radio button `name` attributes use prefix `g1`–`g7` (Governance tab) and `q1`–`q7` (Quality tab).
- Result elements follow the pattern: `#score-{domain}-val`, `#badge-{domain}`, `#bar-{domain}`, `#rec-{domain}`, `#result-{domain}`, `#val-{domain}`.
- Score = average of 7 answers (1–5). Bar fill % = `(score - 1) / 4 * 100`.
- Maturity levels and recommendation text are defined in the `LEVELS` array in the script — this is the single source of truth for thresholds, colours, and copy.

## Git & Version Control

After completing any meaningful unit of work, commit the changes and push to GitHub so progress is never lost.

- **Commit often** — after each feature, fix, or significant edit to `index.html`.
- **Push immediately** after committing: `git push`.
- **Commit messages** must be concise and descriptive, following this format:
  - `feat: add data lineage tab with 7 questions`
  - `fix: correct bar fill calculation for edge case score=1`
  - `style: improve mobile layout for result panel`
  - `docs: update CLAUDE.md with git workflow`
- Never batch unrelated changes into a single commit.
- If the repo is not yet initialised, run `git init`, add the remote, and push before starting work.

### Adding a new tab

1. Add a `.tab-btn` in the tab bar calling `switchTab('newdomain', this)`.
2. Add a `.tab-panel` with `id="panel-newdomain"` containing a `<form id="form-newdomain">` with questions using name prefix `n1`–`n7` (or chosen prefix).
3. Add a `#result-newdomain` result panel with the standard child IDs.
4. `submitForm('newdomain')` works without changes as long as the prefix matches the radio `name` attributes passed via the `prefix` variable in the function.
