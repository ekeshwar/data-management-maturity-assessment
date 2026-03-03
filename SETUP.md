# EDM Platform — Dev Environment Setup

Follow these steps in order. Steps 1–3 are one-time installs.

---

## Step 1 — Install Node.js

1. Open **https://nodejs.org** in your browser.
2. Download the **LTS** installer (`.msi` for Windows).
3. Run the installer — accept all defaults (make sure "Add to PATH" is checked).
4. Open a **new** Command Prompt / PowerShell window and verify:
   ```
   node --version   # should print v20.x.x or later
   npm --version    # should print 10.x.x or later
   ```

---

## Step 2 — Get a PostgreSQL Database

You have two options. **Option A (cloud, easier)** is recommended for getting started fast.

### Option A — Neon (free cloud PostgreSQL, no install)

1. Go to **https://neon.tech** and sign up for a free account.
2. Create a new **Project** (e.g. `edm-platform`).
3. In the project dashboard, click **Connection string** and copy the `postgres://...` URL.
4. The URL looks like:
   ```
   postgresql://user:password@ep-something.us-east-2.aws.neon.tech/edm_db?sslmode=require
   ```
5. Paste it as `DATABASE_URL` in `.env`.

### Option B — Local PostgreSQL

1. Download from **https://www.postgresql.org/download/windows/** and install.
2. During install, set a password for the `postgres` superuser.
3. Open **pgAdmin** (installed alongside PostgreSQL), create a database called `edm_db`.
4. Your connection string will be:
   ```
   postgresql://postgres:yourpassword@localhost:5432/edm_db
   ```
5. Paste it as `DATABASE_URL` in `.env`.

---

## Step 3 — Initialise the Database Schema

Once `DATABASE_URL` is set in `.env`:

### If using Neon or any remote DB with `psql` available:
```bash
psql "your_connection_string_here" -f server/schema.sql
```

### If using pgAdmin (GUI):
1. Open pgAdmin → connect to your database.
2. Open **Query Tool**.
3. Open `server/schema.sql`, paste its contents, and click **Execute**.

You should see three tables created: `users`, `user_access`, `audit_log`.

---

## Step 4 — Configure SMTP (email for OTP delivery)

The easiest option is **Gmail with an App Password**.

1. Log in to the Gmail account you want to send OTPs from.
2. Go to **https://myaccount.google.com/security** → enable **2-Step Verification** (required).
3. Go to **https://myaccount.google.com/apppasswords**.
4. Choose App = `Mail`, Device = `Other` → type `EDM Platform` → click **Generate**.
5. Copy the 16-character password shown.
6. In `.env`, set:
   ```
   SMTP_USER=yourgmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx   (the 16-char app password, spaces ok)
   EMAIL_FROM=EDM Platform <yourgmail@gmail.com>
   ```

> **Note:** During development you can skip SMTP for now and use a service like
> **Mailtrap** (https://mailtrap.io, free) to capture outgoing emails without
> actually sending them. Replace SMTP settings with your Mailtrap credentials.

---

## Step 5 — Install npm Dependencies

Open a terminal in the project root folder and run:
```bash
npm install
```

This reads `package.json` and installs Express, pg, bcryptjs, jwt, nodemailer, etc. into `node_modules/`.

---

## Step 6 — Start the Server

```bash
npm start
```

You should see:
```
EDM Platform server running on http://localhost:3000
```

For development (auto-restart on file changes):
```bash
npm run dev
```

---

## Step 7 — Create the First Admin User

1. Open **http://localhost:3000/login.html** in your browser.
2. Click **Request access**.
3. Enter your email and name → click **Send Verification Code**.
4. Check your inbox for the 6-digit OTP (or check Mailtrap if using that).
5. Enter the OTP + set a password → you'll be logged in as a `maker` by default.
6. To make yourself an admin: open pgAdmin / psql and run:
   ```sql
   UPDATE users SET role = 'admin', is_active = true WHERE email = 'your@email.com';
   ```
7. Refresh the app — you'll see the **User Management** tab appear.

---

## Step 8 — (Optional) Add reCAPTCHA for Production

CAPTCHA is **automatically skipped in dev mode** (when `RECAPTCHA_SECRET` is blank).
Before deploying to production:

1. Go to **https://www.google.com/recaptcha/admin**.
2. Register a new site → choose **reCAPTCHA v2 "I'm not a robot"**.
3. Add your production domain (e.g. `yourdomain.com`).
4. Copy the **Site Key** and the **Secret Key**.
5. In `.env`: set `RECAPTCHA_SECRET=<secret key>`.
6. In `login.html`: replace both occurrences of `__RECAPTCHA_SITE_KEY__` with your site key.

---

## Quick Reference

| What | Where |
|---|---|
| Environment variables | `.env` (copy from `.env.example`) |
| DB schema | `server/schema.sql` |
| Server entry point | `server/index.js` |
| Auth routes | `server/routes/auth.js` |
| User management routes | `server/routes/users.js` |
| Login page | `http://localhost:3000/login.html` |
| Main app | `http://localhost:3000/index.html` |

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Cannot find module 'express'` | Run `npm install` |
| `Missing required environment variables: DATABASE_URL` | Set `DATABASE_URL` in `.env` |
| `ECONNREFUSED` connecting to DB | Check DB is running and connection string is correct |
| OTP email not arriving | Check SMTP credentials; use Mailtrap for dev |
| `CAPTCHA verification failed` | Leave `RECAPTCHA_SECRET` blank in `.env` for dev mode |
| `Invalid or expired token` on page load | Clear `localStorage` in browser DevTools and log in again |
