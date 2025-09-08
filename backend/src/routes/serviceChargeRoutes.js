const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { body, query, param, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/service-charge-reports
 * @desc    Menyimpan atau memperbarui data laporan Service Charge
 * @access  Private (memerlukan izin 'create:reports')
 */
router.post('/', [
    authenticateToken,
    checkPermission('create:reports'),
    body('hotel_id', 'Hotel harus dipilih').isInt(),
    body('report_date', 'Tanggal laporan harus diisi').isISO8601().toDate(),
    body('cash_fo', 'Cash FO harus angka').isNumeric(),
    body('cash_fb', 'Cash F&B harus angka').isNumeric(),
    body('cash_short_over', 'Cash Short/Over harus angka').isNumeric(),
    body('bank_in_ar_payment', 'Bank In AR Payment harus angka').isNumeric(),
    body('used_ar_deposit', 'Used AR Deposit harus angka').isNumeric(),
    body('gdrive_link', 'Link Google Drive harus URL yang valid (opsional)').optional({ checkFalsy: true }).isURL(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        hotel_id, report_date, cash_fo, cash_fb, cash_short_over,
        bank_in_ar_payment, used_ar_deposit, notes, gdrive_link
    } = req.body;
    const user_id = req.user.id;

    const query = `
        INSERT INTO service_charge_reports (
            hotel_id, user_id, report_date, cash_fo, cash_fb, cash_short_over,
            bank_in_ar_payment, used_ar_deposit, notes, gdrive_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (hotel_id, report_date) DO UPDATE SET
            user_id = EXCLUDED.user_id, cash_fo = EXCLUDED.cash_fo, cash_fb = EXCLUDED.cash_fb,
            cash_short_over = EXCLUDED.cash_short_over, bank_in_ar_payment = EXCLUDED.bank_in_ar_payment,
            used_ar_deposit = EXCLUDED.used_ar_deposit, notes = EXCLUDED.notes, gdrive_link = EXCLUDED.gdrive_link,
            created_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;

    try {
        const { rows } = await pool.query(query, [
            hotel_id, user_id, report_date, cash_fo, cash_fb, cash_short_over,
            bank_in_ar_payment, used_ar_deposit, notes, gdrive_link
        ]);
        res.status(201).json({ msg: 'Laporan Service Charge berhasil disimpan.', data: rows[0] });
    } catch (error) {
        console.error('Error saat menyimpan laporan Service Charge:', error);
        res.status(500).json({ message: 'Server error saat menyimpan laporan.' });
    }
});

/**
 * @route   GET /api/service-charge-reports
 * @desc    Mengambil data laporan Service Charge dengan filter
 * @access  Private (memerlukan izin 'view:reports')
 */
router.get('/', [
    authenticateToken,
    checkPermission('view:reports'),
    query('hotel_id').optional().isInt({ min: 1 }).withMessage('ID Hotel tidak valid'),
    query('start_date').optional().isISO8601().withMessage('Format tanggal awal tidak valid'),
    query('end_date').optional().isISO8601().withMessage('Format tanggal akhir tidak valid'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, start_date, end_date } = req.query;

    let baseQuery = `
        SELECT
            scr.id,
            h.name AS hotel_name,
            scr.hotel_id,
            scr.report_date,
            scr.cash_fo,
            scr.cash_fb,
            scr.cash_short_over,
            (scr.cash_fo + scr.cash_fb + scr.cash_short_over) AS total_cash_collection,
            scr.bank_in_ar_payment,
            scr.used_ar_deposit,
            (scr.bank_in_ar_payment + scr.used_ar_deposit) AS total_ar_collection,
            (scr.cash_fo + scr.cash_fb + scr.cash_short_over + scr.bank_in_ar_payment + scr.used_ar_deposit) AS total_collection,
            scr.notes,
            scr.gdrive_link,
            scr.created_at,
            u.username AS submitted_by
        FROM service_charge_reports scr
        JOIN hotels h ON scr.hotel_id = h.id
        JOIN users u ON scr.user_id = u.id
    `;

    const whereClauses = [];
    const queryParams = [];
    let paramIndex = 1;

    if (hotel_id) {
        whereClauses.push(`scr.hotel_id = $${paramIndex++}`);
        queryParams.push(hotel_id);
    }
    if (start_date) {
        whereClauses.push(`scr.report_date >= $${paramIndex++}`);
        queryParams.push(start_date);
    }
    if (end_date) {
        whereClauses.push(`scr.report_date <= $${paramIndex++}`);
        queryParams.push(end_date);
    }

    if (whereClauses.length > 0) {
        baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ' ORDER BY scr.report_date DESC, h.name ASC;';

    try {
        const { rows } = await pool.query(baseQuery, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error saat mengambil laporan Service Charge:', error);
        res.status(500).json({ message: 'Server error saat mengambil laporan.' });
    }
});

/**
 * @route   GET /api/service-charge-reports/:id
 * @desc    Mengambil detail satu laporan Service Charge
 * @access  Private (memerlukan izin 'view:reports')
 */
router.get('/:id', [
    authenticateToken,
    checkPermission('view:reports'),
    param('id').isInt().withMessage('ID Laporan tidak valid'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const query = `
        SELECT
            scr.id,
            h.name AS hotel_name,
            scr.hotel_id,
            scr.report_date,
            scr.cash_fo,
            scr.cash_fb,
            scr.cash_short_over,
            (scr.cash_fo + scr.cash_fb + scr.cash_short_over) AS total_cash_collection,
            scr.bank_in_ar_payment,
            scr.used_ar_deposit,
            (scr.bank_in_ar_payment + scr.used_ar_deposit) AS total_ar_collection,
            (scr.cash_fo + scr.cash_fb + scr.cash_short_over + scr.bank_in_ar_payment + scr.used_ar_deposit) AS total_collection,
            scr.notes,
            scr.gdrive_link,
            scr.created_at,
            u.username AS submitted_by
        FROM service_charge_reports scr
        JOIN hotels h ON scr.hotel_id = h.id
        JOIN users u ON scr.user_id = u.id
        WHERE scr.id = $1;
    `;

    try {
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error saat mengambil detail laporan Service Charge:', error);
        res.status(500).json({ message: 'Server error saat mengambil detail laporan.' });
    }
});

/**
 * @route   DELETE /api/service-charge-reports/:id
 * @desc    Menghapus data laporan Service Charge
 * @access  Private (memerlukan izin 'delete:reports')
 */
router.delete('/:id', [
    authenticateToken,
    checkPermission('delete:reports'),
    param('id').isInt().withMessage('ID Laporan tidak valid'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM service_charge_reports WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        }
        res.json({ msg: 'Laporan Service Charge berhasil dihapus.' });
    } catch (error) {
        console.error('Error saat menghapus laporan Service Charge:', error);
        res.status(500).json({ message: 'Server error saat menghapus laporan.' });
    }
});

module.exports = router;