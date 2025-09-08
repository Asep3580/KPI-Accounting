const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' }); // Pastikan path ke .env benar

// Membuat instance pool koneksi database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

console.log('Database connection pool created.');

module.exports = pool;