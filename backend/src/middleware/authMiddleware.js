const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware untuk memverifikasi token JWT dari header Authorization.
 * Jika valid, payload token akan ditambahkan ke `req.user`.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ msg: 'Token tidak ditemukan. Otorisasi ditolak.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ msg: 'Token tidak valid.' });
        }
        // 'user' di sini adalah payload yang didekode dari token
        req.user = user;
        next();
    });
};

/**
 * Middleware untuk memeriksa apakah pengguna memiliki peran yang diperlukan.
 * Memberikan akses otomatis jika peran pengguna adalah 'Admin'.
 * @param {string} requiredRole - Nama peran yang diperlukan.
 */
const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ msg: 'Akses ditolak. Pengguna tidak terautentikasi.' });
        }
        // Admin (dicek via ID atau nama) selalu memiliki akses.
        // Atau jika peran pengguna cocok dengan yang disyaratkan.
        if (req.user.role_id === 1 || (req.user.role_name && req.user.role_name.toLowerCase() === 'admin') || (req.user.role_name === requiredRole)) {
            return next();
        }
        res.status(403).json({ msg: 'Akses ditolak. Anda tidak memiliki peran yang diperlukan.' });
    };
};

/**
 * Middleware untuk memeriksa apakah peran (role) pengguna memiliki izin tertentu.
 * @param {string} requiredPermission - Nama izin yang diperlukan (contoh: 'edit:users').
 * @returns {function} Middleware function.
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    // 1. Pastikan pengguna terautentikasi
    if (!req.user) {
      return res.status(401).json({ msg: 'Akses ditolak. Pengguna tidak terautentikasi.' });
    }

    // 2. Berikan akses penuh kepada Admin tanpa perlu cek database.
    //    Ini adalah cara yang lebih andal untuk menangani akses admin di seluruh sistem.
    //    Mengecek ID (jika ada) dan nama (sebagai fallback).
    if (req.user.role_id === 1 || (req.user.role_name && req.user.role_name.toLowerCase() === 'admin')) {
      return next();
    }

    // 3. Untuk non-admin, pastikan role_id ada untuk melanjutkan pengecekan izin.
    if (!req.user.role_id) {
      return res.status(403).json({ msg: 'Akses ditolak. Informasi peran tidak lengkap untuk memeriksa izin.' });
    }

    try {
      const permissionQuery = `
        SELECT 1
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND p.name = $2;
      `;
      
      const result = await pool.query(permissionQuery, [req.user.role_id, requiredPermission]);

      if (result.rowCount > 0) {
        // Izin ditemukan, lanjutkan ke handler rute berikutnya.
        next();
      } else {
        // Izin tidak ditemukan untuk peran ini.
        res.status(403).json({ msg: 'Akses ditolak. Anda tidak memiliki izin yang diperlukan.' });
      }
    } catch (error) {
      console.error('Error saat memeriksa izin:', error);
      res.status(500).send('Server error saat validasi izin.');
    }
  };
};

module.exports = {
    authenticateToken,
    authorizeRole,
    checkPermission
};