const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/report-targets
 * @desc    Mendapatkan semua target laporan
 * @access  Private
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM report_targets ORDER BY id');
        // Ubah menjadi objek/map agar mudah diakses di frontend
        const targets = rows.reduce((acc, row) => {
            acc[row.report_type] = row;
            return acc;
        }, {});
        res.json(targets);
    } catch (error) {
        console.error('Error saat mengambil target laporan:', error);
        res.status(500).json({ message: 'Server error saat mengambil target laporan' });
    }
});

/**
 * @route   POST /api/report-targets
 * @desc    Membuat atau memperbarui target laporan (UPSERT)
 * @access  Private
 */
router.post('/', [
    authenticateToken,
    body('report_type').isString().notEmpty(),
    body('target_type').isIn(['daily', 'weekly', 'monthly']),
    body('target_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('target_time harus dalam format HH:mm'),
    body('day_of_week')
        .if(body('target_type').equals('weekly'))
        .isInt({ min: 0, max: 6 }).withMessage('day_of_week harus antara 0 dan 6 untuk target mingguan'),
    body('day_of_month')
        .if(body('target_type').equals('monthly'))
        .isInt({ min: 1, max: 31 }).withMessage('day_of_month harus antara 1 dan 31 untuk target bulanan')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { report_type, target_type, target_time, day_of_week, day_of_month } = req.body;

    const dow = target_type === 'weekly' ? day_of_week : null;
    const dom = target_type === 'monthly' ? day_of_month : null;

    try {
        const query = `
            INSERT INTO report_targets (report_type, target_type, target_time, day_of_week, day_of_month)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (report_type)
            DO UPDATE SET
                target_type = EXCLUDED.target_type, target_time = EXCLUDED.target_time,
                day_of_week = EXCLUDED.day_of_week, day_of_month = EXCLUDED.day_of_month, updated_at = NOW()
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [report_type, target_type, target_time, dow, dom]);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error saat menyimpan target laporan:', error);
        res.status(500).json({ message: 'Server error saat menyimpan target laporan' });
    }
});

module.exports = router;