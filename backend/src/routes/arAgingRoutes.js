const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

// Helper function untuk menemukan kunci di dalam objek secara case-insensitive.
// Ini membuat endpoint lebih andal terhadap variasi nama kolom di Excel.
const findKey = (obj, keyToFind) => {
    return Object.keys(obj).find(key => key.trim().toLowerCase() === keyToFind.trim().toLowerCase());
};

const validateArAgingData = [
    body('hotel_id', 'Hotel ID harus diisi').isInt(),
    body('report_date', 'Tanggal laporan harus valid').isISO8601().toDate(),
    body('data', 'Data laporan harus berupa array dan tidak kosong').isArray({ min: 1 }),
    // Validator kustom untuk memastikan kolom paling penting ada di setiap baris.
    body('data').custom((dataArray) => {
        for (const row of dataArray) {
            const customerNameKey = findKey(row, 'CUSTOMER NAME');
            if (!customerNameKey || !row[customerNameKey]) {
                throw new Error('Setiap baris data harus memiliki kolom "CUSTOMER NAME".');
            }
        }
        return true;
    }),
];

/**
 * @route   POST /api/ar-aging-reports/bulk
 * @desc    Menyimpan data laporan AR Aging secara massal
 * @access  Private (memerlukan izin 'submit:ar-aging')
 */
router.post('/bulk', [authenticateToken, checkPermission('submit:ar-aging'), ...validateArAgingData], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, report_date, data } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Hapus data lama untuk hotel dan tanggal yang sama untuk mencegah duplikasi saat submit ulang
        await client.query('DELETE FROM ar_aging_reports WHERE hotel_id = $1 AND report_date = $2', [hotel_id, report_date]);

        const insertQuery = `
            INSERT INTO ar_aging_reports (
                hotel_id, report_date, customer_name, outstanding, 
                days_1_30, days_31_60, days_61_90, days_over_90, remark
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const row of data) {
            // Helper untuk mendapatkan nilai dari baris secara case-insensitive
            const getValue = (key) => {
                const foundKey = findKey(row, key);
                return foundKey ? row[foundKey] : null;
            };

            const values = [
                hotel_id, report_date, getValue('CUSTOMER NAME'),
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
        res.status(201).json({ msg: 'Laporan AR Aging berhasil disimpan.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saat menyimpan laporan AR Aging:', error);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

/**
 * @route   GET /api/ar-aging-reports
 * @desc    Mengambil data laporan AR Aging yang sudah tersimpan dengan filter
 * @access  Private (memerlukan izin 'view:reports')
 */
router.get('/', [
    authenticateToken,
    checkPermission('view:reports'),
    query('hotel_id').optional().isInt(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601()
], async (req, res) => {
    const { hotel_id, start_date, end_date } = req.query;

    let sqlQuery = `
        SELECT 
            ar.id, ar.report_date, ar.customer_name, ar.outstanding, 
            ar.days_1_30, ar.days_31_60, ar.days_61_90, ar.days_over_90, 
            ar.remark, h.name as hotel_name
        FROM ar_aging_reports ar
        JOIN hotels h ON ar.hotel_id = h.id
        WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (hotel_id) {
        sqlQuery += ` AND ar.hotel_id = $${paramIndex++}`;
        queryParams.push(hotel_id);
    }
    if (start_date) {
        sqlQuery += ` AND ar.report_date >= $${paramIndex++}`;
        queryParams.push(start_date);
    }
    if (end_date) {
        sqlQuery += ` AND ar.report_date <= $${paramIndex++}`;
        queryParams.push(end_date);
    }

    sqlQuery += ' ORDER BY ar.report_date DESC, h.name, ar.customer_name;';

    try {
        const { rows } = await pool.query(sqlQuery, queryParams);
        res.json(rows);
    } catch (error) {
        console.error('Error saat mengambil laporan AR Aging:', error);
        res.status(500).send('Server error');
    }
});

/**
 * @route   DELETE /api/ar-aging-reports
 * @desc    Menghapus semua data laporan AR Aging untuk hotel dan tanggal tertentu
 * @access  Private (memerlukan izin 'delete:reports')
 */
router.delete('/', [
    authenticateToken,
    checkPermission('delete:reports'), // Pastikan izin ini ada di database dan diberikan ke role Admin
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
            'DELETE FROM ar_aging_reports WHERE hotel_id = $1 AND report_date = $2',
            [hotel_id, report_date]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ msg: 'Tidak ada laporan yang ditemukan untuk hotel dan tanggal tersebut.' });
        }

        res.json({ msg: `Berhasil menghapus ${deleteResult.rowCount} baris data laporan AR Aging.` });
    } catch (error) {
        console.error('Error saat menghapus laporan AR Aging:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;