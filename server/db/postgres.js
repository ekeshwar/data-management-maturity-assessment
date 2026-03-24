'use strict';
const { Pool } = require('pg');
const config = require('../config');

const { hostname } = new URL(config.databaseUrl);
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
const pool = new Pool({
  connectionString: config.databaseUrl,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
