const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   GET /api/roles
 * @desc    Mengambil semua peran (roles)
 * @access  Private (memerlukan izin 'view:users' atau sejenisnya)
 */
router.get('/', [authenticateToken, checkPermission('view:users')], async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name FROM roles ORDER BY name');
        res.json(rows);
    } catch (error) {
        console.error('Error saat mengambil data peran:', error);
        res.status(500).send('Server error');
    }
});

/**
 * @route   GET /api/roles/:id/permissions
 * @desc    Mengambil semua nama izin untuk peran (role) tertentu.
 * @access  Private
 */
router.get('/:id/permissions', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1;
        `;
        const { rows } = await pool.query(query, [id]);
        // Mengembalikan array berisi nama izin, contoh: ['view:users', 'edit:users']
        res.json(rows.map(p => p.name));
    } catch (error) {
        console.error('Error saat mengambil izin peran:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;