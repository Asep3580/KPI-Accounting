const express = require('express');
const pool = require('../config/db');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * Helper function to find a key in an object case-insensitively.
 * @param {object} obj The object to search in.
 * @param {string} keyToFind The key to find.
 * @returns {string|null} The found key or null.
 */
const findKey = (obj, keyToFind) => {
    return Object.keys(obj).find(k => k.toLowerCase().trim() === keyToFind.toLowerCase().trim()) || null;
};

/**
 * @route   POST /api/soh-inventory-reports/bulk
 * @desc    Menyimpan data laporan SOH Inventory secara massal
 * @access  Private (memerlukan izin 'create:reports')
 */
router.post('/bulk', [
    authenticateToken,
    checkPermission('create:reports'),
    body('hotel_id', 'Hotel ID harus diisi').isInt(),
    body('report_date', 'Tanggal laporan harus diisi').isISO8601().toDate(),
    body('data', 'Data laporan harus berupa array').isArray({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, report_date, data } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Hapus data lama untuk hotel dan tanggal yang sama untuk mencegah duplikat
        await client.query('DELETE FROM soh_inventory_reports WHERE hotel_id = $1 AND report_date = $2', [hotel_id, report_date]);

        const insertQuery = `
            INSERT INTO soh_inventory_reports (
                hotel_id, report_date, storage, article, description, unit,
                actual_qty, actual_value, act_p_price, avrg_price, sub_group
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        for (const row of data) {
            const getValue = (key) => {
                const foundKey = findKey(row, key);
                return foundKey ? row[foundKey] : null;
            };

            const values = [
                hotel_id, report_date, getValue('Storage'), getValue('Article'), getValue('Description'), getValue('Unit'),
                parseFloat(getValue('Actual Qty')) || 0,
                parseFloat(getValue('Actual Value')) || 0,
                parseFloat(getValue('Act P-Price')) || 0,
                parseFloat(getValue('Avrg Price')) || 0,
                getValue('Sub Group')
            ];
            await client.query(insertQuery, values);
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Laporan SOH Inventory berhasil disimpan.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saat menyimpan laporan SOH Inventory:', error);
        res.status(500).json({ message: 'Server error saat menyimpan laporan.' });
    } finally {
        client.release();
    }
});

/**
 * @route   DELETE /api/soh-inventory-reports
 * @desc    Menghapus semua data laporan SOH Inventory untuk hotel dan tanggal tertentu
 * @access  Private (memerlukan izin 'delete:reports')
 */
router.delete('/', [authenticateToken, checkPermission('delete:reports')], async (req, res) => {
    const { hotel_id, report_date } = req.query;

    if (!hotel_id || !report_date) {
        return res.status(400).json({ message: 'Hotel ID dan tanggal laporan harus diisi.' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM soh_inventory_reports WHERE hotel_id = $1 AND report_date = $2',
            [hotel_id, report_date]
        );

        if (result.rowCount > 0) {
            res.json({ msg: `Laporan SOH Inventory untuk tanggal tersebut berhasil dihapus (${result.rowCount} baris).` });
        } else {
            res.status(404).json({ message: 'Tidak ada laporan yang ditemukan untuk hotel dan tanggal yang dipilih.' });
        }
    } catch (error) {
        console.error('Error saat menghapus laporan SOH Inventory:', error);
        res.status(500).send('Server error');
    }
});

/**
 * @route   GET /api/soh-inventory-reports/summary
 * @desc    Mendapatkan ringkasan laporan SOH Inventory dengan filter
 * @access  Private (memerlukan token)
 */
router.get('/summary', [
    authenticateToken,
    query('hotel_id').optional().isInt().withMessage('Hotel ID harus berupa angka.'),
    query('start_date').optional().isISO8601().withMessage('Format tanggal awal tidak valid.'),
    query('end_date').optional().isISO8601().withMessage('Format tanggal akhir tidak valid.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, start_date, end_date } = req.query;

    try {
        let queryText = `
            SELECT
                MIN(sir.id) as id,
                sir.hotel_id,
                h.name AS hotel_name,
                sir.report_date,
                SUM(CASE WHEN sir.sub_group ILIKE 'Food' THEN sir.actual_value ELSE 0 END) AS total_food,
                SUM(CASE WHEN sir.sub_group ILIKE 'Beverage' THEN sir.actual_value ELSE 0 END) AS total_beverage,
                SUM(CASE WHEN sir.sub_group ILIKE 'Material' THEN sir.actual_value ELSE 0 END) AS total_material,
                SUM(sir.actual_value) AS total_overall
            FROM
                soh_inventory_reports sir
            JOIN
                hotels h ON sir.hotel_id = h.id
        `;

        const whereClauses = [];
        const queryParams = [];
        let paramIndex = 1;

        if (hotel_id) {
            whereClauses.push(`sir.hotel_id = $${paramIndex++}`);
            queryParams.push(hotel_id);
        }
        if (start_date) {
            whereClauses.push(`sir.report_date >= $${paramIndex++}`);
            queryParams.push(start_date);
        }
        if (end_date) {
            whereClauses.push(`sir.report_date <= $${paramIndex++}`);
            queryParams.push(end_date);
        }

        if (whereClauses.length > 0) {
            queryText += ' WHERE ' + whereClauses.join(' AND ');
        }

        queryText += `
            GROUP BY
                sir.hotel_id, h.name, sir.report_date
            ORDER BY
                sir.report_date DESC, h.name ASC;
        `;

        const { rows } = await pool.query(queryText, queryParams);
        res.json(rows);

    } catch (error) {
        console.error('Error saat mengambil ringkasan laporan SOH:', error);
        res.status(500).json({ message: 'Server error saat mengambil ringkasan laporan.' });
    }
});

/**
 * @route   GET /api/soh-inventory-reports/detail/:id
 * @desc    Mendapatkan detail lengkap dari sebuah laporan SOH Inventory
 * @access  Private (memerlukan token)
 */
router.get('/detail/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'ID laporan tidak valid.' });
    }

    try {
        const queryText = `
            SELECT
                sir.*,
                h.name as hotel_name
            FROM
                soh_inventory_reports sir
            JOIN
                hotels h ON sir.hotel_id = h.id
            WHERE
                (sir.hotel_id, sir.report_date) IN (
                    SELECT hotel_id, report_date FROM soh_inventory_reports WHERE id = $1
                )
            ORDER BY
                sir.sub_group, sir.description;
        `;

        const { rows } = await pool.query(queryText, [id]);

        res.json(rows);

    } catch (error) {
        console.error(`Error saat mengambil detail laporan SOH (ID: ${id}):`, error);
        res.status(500).json({ message: 'Server error saat mengambil detail laporan.' });
    }
});

module.exports = router;