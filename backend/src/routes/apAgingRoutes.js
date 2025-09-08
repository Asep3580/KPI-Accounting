const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

// Helper untuk menemukan kunci secara case-insensitive
const findKey = (obj, keyToFind) => {
    return Object.keys(obj).find(key => key.trim().toLowerCase() === keyToFind.trim().toLowerCase());
};

const validateApAgingData = [
    body('hotel_id', 'Hotel ID harus diisi').isInt(),
    body('report_date', 'Tanggal laporan harus valid').isISO8601().toDate(),
    body('data', 'Data laporan harus berupa array dan tidak kosong').isArray({ min: 1 }),
    body('data').custom((dataArray) => {
        for (const row of dataArray) {
            const supplierNameKey = findKey(row, 'SUPPLIER NAME');
            if (!supplierNameKey || !row[supplierNameKey]) {
                throw new Error('Setiap baris data harus memiliki kolom "SUPPLIER NAME".');
            }
        }
        return true;
    }),
];

/**
 * @route   POST /api/ap-aging-reports/bulk
 * @desc    Menyimpan data laporan AP Aging secara massal
 * @access  Private (memerlukan izin 'submit:ap-aging')
 */
router.post('/bulk', [authenticateToken, checkPermission('submit:ap-aging'), ...validateApAgingData], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, report_date, data } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ap_aging_reports WHERE hotel_id = $1 AND report_date = $2', [hotel_id, report_date]);

        const insertQuery = `
            INSERT INTO ap_aging_reports (
                hotel_id, report_date, supplier_name, outstanding, 
                days_1_30, days_31_60, days_61_90, days_over_90, remark
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const row of data) {
            const getValue = (key) => {
                const foundKey = findKey(row, key);
                return foundKey ? row[foundKey] : null;
            };
            const values = [
                hotel_id, report_date, getValue('SUPPLIER NAME'),
                parseFloat(getValue('OUTSTANDING')) || 0,
                parseFloat(getValue('1 - 30 DAYS')) || 0,
                parseFloat(getValue('31 - 60 DAYS')) || 0,
                parseFloat(getValue('61 - 90 DAYS')) || 0,
                parseFloat(getValue('OVER 90 DAYS')) || 0,
                getValue('REMARK')
            ];
            await client.query(insertQuery, values);
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Laporan AP Aging berhasil disimpan.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saat menyimpan laporan AP Aging:', error);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/ap-aging-reports
 * @desc    Mendapatkan data laporan AP Aging dengan filter
 * @access  Private (memerlukan izin 'view:reports')
 */
router.get('/', [authenticateToken, checkPermission('view:reports')], async (req, res) => {
    const { hotel_id, start_date, end_date } = req.query;

    let query = `
        SELECT 
            ar.id,
            ar.hotel_id,
            h.name AS hotel_name,
            ar.report_date,
            ar.supplier_name,
            ar.outstanding,
            ar.days_1_30,
            ar.days_31_60,
            ar.days_61_90,
            ar.days_over_90,
            ar.remark
        FROM 
            ap_aging_reports ar
        JOIN 
            hotels h ON ar.hotel_id = h.id
        WHERE 1=1
    `;
    const queryParams = [];

    if (hotel_id) {
        queryParams.push(hotel_id);
        query += ` AND ar.hotel_id = $${queryParams.length}`;
    }
    if (start_date) {
        queryParams.push(start_date);
        query += ` AND ar.report_date >= $${queryParams.length}`;
    }
    if (end_date) {
        queryParams.push(end_date);
        query += ` AND ar.report_date <= $${queryParams.length}`;
    }

    query += ' ORDER BY ar.report_date DESC, h.name, ar.supplier_name';

    try {
        const { rows } = await pool.query(query, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error saat mengambil laporan AP Aging:', error);
        res.status(500).send('Server error');
    }
});

/**
 * @route   DELETE /api/ap-aging-reports
 * @desc    Menghapus semua data laporan AP Aging untuk hotel dan tanggal tertentu
 * @access  Private (memerlukan izin 'delete:reports')
 */
router.delete('/', [
    authenticateToken,
    checkPermission('delete:reports'),
    query('hotel_id', 'Hotel ID harus diisi').isInt(),
    query('report_date', 'Tanggal laporan harus valid').isISO8601()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, report_date } = req.query;

    try {
        const deleteResult = await pool.query(
            'DELETE FROM ap_aging_reports WHERE hotel_id = $1 AND report_date = $2',
            [hotel_id, report_date]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ msg: 'Tidak ada laporan yang ditemukan untuk hotel dan tanggal tersebut.' });
        }

        res.json({ msg: `Berhasil menghapus ${deleteResult.rowCount} baris data laporan AP Aging.` });
    } catch (error) {
        console.error('Error saat menghapus laporan AP Aging:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;