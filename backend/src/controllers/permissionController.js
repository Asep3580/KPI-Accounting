const pool = require('../config/db');

/**
 * GET /api/permissions - Mendapatkan semua hak akses yang tersedia
 */
const getAllPermissions = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM permissions ORDER BY description ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = {
    getAllPermissions,
};