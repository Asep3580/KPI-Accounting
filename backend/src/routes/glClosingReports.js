const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

// Aturan validasi menggunakan express-validator
const validateGlClosingReport = [
    body('hotel_id').isInt().withMessage('Hotel ID harus berupa angka.'),
    body('report_date').isISO8601().toDate().withMessage('Format tanggal tidak valid.'),
    body('actual_revenue').isFloat({ gt: 0 }).withMessage('Actual Revenue harus angka lebih dari 0.'),
    body('actual_expenses').isFloat({ min: 0 }).withMessage('Actual Expenses harus angka positif.'),
    body('budget_revenue').isFloat({ gt: 0 }).withMessage('Budget Revenue harus angka lebih dari 0.'),
    body('budget_expenses').isFloat({ min: 0 }).withMessage('Budget Expenses harus angka positif.'),
    body('gdrive_link').optional({ checkFalsy: true }).isURL().withMessage('Link Google Drive tidak valid.')
];

// Endpoint: POST /api/gl-closing-reports
// Deskripsi: Menyimpan atau memperbarui laporan GL closing bulanan.
router.post('/', authenticateToken, validateGlClosingReport, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    }

    const {
        hotel_id,
        report_date,
        actual_revenue,
        actual_expenses,
        budget_revenue,
        budget_expenses,
        gdrive_link
    } = req.body;

    // Lakukan kalkulasi di backend untuk memastikan integritas data
    const actualGop = parseFloat(actual_revenue) - parseFloat(actual_expenses);
    const actualGopRatio = parseFloat(actual_revenue) !== 0 ? (actualGop / parseFloat(actual_revenue)) * 100 : 0;
    const budgetGop = parseFloat(budget_revenue) - parseFloat(budget_expenses);
    const budgetGopRatio = parseFloat(budget_revenue) !== 0 ? (budgetGop / parseFloat(budget_revenue)) * 100 : 0;

    const query = `
        INSERT INTO gl_closing_reports (
            hotel_id, report_date, 
            actual_revenue, actual_expenses, actual_gop, actual_gop_ratio,
            budget_revenue, budget_expenses, budget_gop, budget_gop_ratio,
            gdrive_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (hotel_id, report_date) DO UPDATE SET
            actual_revenue = EXCLUDED.actual_revenue,
            actual_expenses = EXCLUDED.actual_expenses,
            actual_gop = EXCLUDED.actual_gop,
            actual_gop_ratio = EXCLUDED.actual_gop_ratio,
            budget_revenue = EXCLUDED.budget_revenue,
            budget_expenses = EXCLUDED.budget_expenses,
            budget_gop = EXCLUDED.budget_gop,
            budget_gop_ratio = EXCLUDED.budget_gop_ratio,
            gdrive_link = EXCLUDED.gdrive_link,
            created_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;

    const values = [
        hotel_id, report_date,
        actual_revenue, actual_expenses, actualGop.toFixed(2), actualGopRatio.toFixed(2),
        budget_revenue, budget_expenses, budgetGop.toFixed(2), budgetGopRatio.toFixed(2),
        gdrive_link || null
    ];

    try {
        const result = await pool.query(query, values);
        res.status(201).json({ 
            msg: 'Laporan GL Closing berhasil disimpan.',
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error saving GL closing report:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat menyimpan laporan.' });
    }
});

// Endpoint: GET /api/gl-closing-reports
// Deskripsi: Mengambil data laporan GL closing dengan filter.
router.get('/', authenticateToken, async (req, res) => {
    const { hotel_id, start_date, end_date } = req.query;

    let query = `
        SELECT
            gl.id,
            gl.report_date,
            h.name as hotel_name,
            gl.actual_revenue,
            gl.actual_expenses,
            gl.actual_gop,
            gl.actual_gop_ratio,
            gl.budget_revenue,
            gl.budget_expenses,
            gl.budget_gop,
            gl.budget_gop_ratio,
            gl.gdrive_link
        FROM gl_closing_reports gl
        JOIN hotels h ON gl.hotel_id = h.id
        WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (hotel_id) { query += ` AND gl.hotel_id = $${paramIndex++}`; values.push(hotel_id); }
    if (start_date) { query += ` AND gl.report_date >= $${paramIndex++}`; values.push(start_date); }
    if (end_date) { query += ` AND gl.report_date <= $${paramIndex++}`; values.push(end_date); }

    query += ' ORDER BY gl.report_date DESC, h.name ASC;';

    try {
        const { rows } = await pool.query(query, values);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching GL closing reports:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil laporan.' });
    }
});

// Endpoint: DELETE /api/gl-closing-reports/:id
// Deskripsi: Menghapus data laporan GL closing berdasarkan ID.
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ message: 'ID laporan tidak valid.' });
    }

    try {
        const result = await pool.query('DELETE FROM gl_closing_reports WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        }

        res.json({ msg: 'Laporan GL Closing berhasil dihapus.' });
    } catch (error) {
        console.error('Error deleting GL closing report:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat menghapus laporan.' });
    }
});

module.exports = router;