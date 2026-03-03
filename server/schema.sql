CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role          VARCHAR(50)  NOT NULL DEFAULT 'maker',
  is_active     BOOLEAN      NOT NULL DEFAULT false,
  otp_hash      VARCHAR(255),
  otp_expires   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_access (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  master_name VARCHAR(255) NOT NULL DEFAULT '*',
  UNIQUE (user_id, client_name, master_name)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email  VARCHAR(255),
  user_role   VARCHAR(50),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INTEGER,
  detail      JSONB,
  ip          VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase 2: Golden Record Case Management

CREATE TABLE IF NOT EXISTS gr_cases (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL DEFAULT 'Generic',
  status       VARCHAR(50)  NOT NULL DEFAULT 'open',
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gr_records (
  id           SERIAL PRIMARY KEY,
  case_id      INTEGER REFERENCES gr_cases(id) ON DELETE CASCADE,
  source_name  VARCHAR(255) NOT NULL DEFAULT 'Source',
  data         JSONB NOT NULL,
  row_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gr_proposals (
  id           SERIAL PRIMARY KEY,
  case_id      INTEGER REFERENCES gr_cases(id) ON DELETE CASCADE UNIQUE,
  proposed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  golden_data  JSONB NOT NULL,
  notes        TEXT,
  status       VARCHAR(50) NOT NULL DEFAULT 'pending',
  reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  proposed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);
