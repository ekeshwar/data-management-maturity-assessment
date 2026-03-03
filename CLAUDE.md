# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-file Node.js + Express web application** — an Enterprise Data Management Platform.
The frontend consists of `index.html` (main app) and `login.html` (auth page).
The backend is a REST API server under `server/`, using PostgreSQL for persistence.

Run with `npm start` (or `npm run dev` for development with nodemon).

## File Structure

```
project root/
├── index.html            ← Main app (DAMA, DQ Assessment, User Management tabs)
├── login.html            ← Auth page (login + OTP registration)
├── package.json          ← Node.js manifest
├── .env                  ← Environment variables (not committed)
├── .env.example          ← Template for .env
├── .gitignore
├── CLAUDE.md
└── server/
    ├── index.js          ← Express entry point, mounts all routes, serves static files
    ├── config.js         ← Reads .env, validates required vars
    ├── schema.sql        ← PostgreSQL DDL (run once to initialise DB)
    ├── db/
    │   └── postgres.js   ← pg Pool + query() helper
    ├── models/
    │   ├── User.js       ← User CRUD + OTP helpers
    │   └── AuditLog.js   ← Append-only audit log writer
    ├── middleware/
    │   ├── auth.js       ← JWT Bearer token verification
    │   └── rbac.js       ← Role gate factory: rbac('admin')
    ├── routes/
    │   ├── auth.js       ← POST /login  POST /register/request  POST /register/verify  GET /me
    │   └── users.js      ← CRUD /users  PATCH role/active  POST/DELETE access
    └── utils/
        ├── email.js      ← Nodemailer SMTP OTP sender
        └── otp.js        ← Generate 6-digit OTP, bcrypt hash + verify
```

## Architecture

### Frontend (`index.html`)
- **Auth guard** (top of `<script>`): verifies JWT via `GET /api/auth/me`; redirects to `login.html` if missing/invalid.
- **Header user bar**: shows logged-in user name + role + Logout button.
- **Tab panels**: DAMA Maturity Assessment, Data Quality Assessment, User Management (admin only).
- **User Management tab**: lists all users, allows role changes, activate/deactivate, invite, and client/master access management.
- All API calls use `Authorization: Bearer <token>` header from `localStorage.getItem('edm_token')`.

### Backend (`server/`)
- Express app with CORS, JSON body parser, rate limiting on auth routes.
- Static file serving from project root — `index.html` and `login.html` are served directly.
- JWT access tokens (8h expiry), bcrypt password hashing, bcrypt OTP hashing.
- reCAPTCHA v2 verification on login + register/request.
- Audit log written for all auth and user management actions.

### Key conventions
- JWT payload: `{ id, email, role }` — signed with `JWT_SECRET`.
- Roles: `admin` | `maker` | `checker`.
- OTP: 6-digit crypto random, bcrypt-hashed in DB, expires in 10 minutes.
- All API errors return `{ error: "message" }` — stack traces never leak to client.

## Setup

1. `npm install`
2. Create a PostgreSQL database.
3. `psql -f server/schema.sql` to create tables.
4. Copy `.env.example` → `.env` and fill in all values.
5. Register at Google reCAPTCHA admin — get site key + secret.
6. `npm start` (or `npm run dev`).
7. Open `http://localhost:3000/login.html`.

## Git & Version Control

After completing any meaningful unit of work, commit the changes and push to GitHub.

- **Commit often** — after each feature, fix, or significant edit.
- **Push immediately** after committing: `git push`.
- **Commit messages** must be concise and descriptive:
  - `feat: add data lineage tab with 7 questions`
  - `fix: correct bar fill calculation for edge case score=1`
  - `style: improve mobile layout for result panel`
  - `docs: update CLAUDE.md with new architecture`
- Never batch unrelated changes into a single commit.

### Adding a new tab to `index.html`

1. Add a `.tab-btn` in the tab bar calling `switchTab('newdomain', this)`.
2. Add a `.tab-panel` with `id="panel-newdomain"`.
3. If the tab needs data, load it inside `switchTab` when `tabId === 'newdomain'`.
4. Add any new API routes in `server/routes/` and mount them in `server/index.js`.
