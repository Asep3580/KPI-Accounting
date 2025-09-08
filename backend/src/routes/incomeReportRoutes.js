const express = require('express');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { query, body, validationResult } = require('express-validator');
const incomeReportController = require('../controllers/incomeAuditReportController');

const router = express.Router();

// Middleware to handle validation errors centrally for this router
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.post(
    '/bulk',
    authenticateToken,
    checkPermission('submit:income_audit'), // Use a more specific permission
    // FIX: Correct validation rules to match the expected object structure { hotel_id, reports: [...] }
    body('hotel_id').isInt({ min: 1 }).withMessage('Hotel ID harus disertakan dan valid.'),
    body('reports').isArray({ min: 1 }).withMessage('Data laporan (reports) harus berupa array dan tidak boleh kosong.'),
    // Optional but recommended: validate some fields inside the reports array.
    // Note: Use bracket notation for keys with spaces.
    body('reports.*.DATE').exists().withMessage('Setiap baris laporan harus memiliki kolom DATE.'),
    body('reports.*["Room Revenue"]').isNumeric().withMessage('Setiap baris laporan harus memiliki "Room Revenue" yang valid.'),
    handleValidationErrors,
    incomeReportController.createBulkIncomeReports);

router.get('/summary', authenticateToken, checkPermission('view:reports'), [
    query('start_date').isISO8601().withMessage('Format tanggal awal tidak valid.'),
    query('end_date').isISO8601().withMessage('Format tanggal akhir tidak valid.'),
    query('hotel_id').optional().isInt().withMessage('Hotel ID harus berupa angka.')
], handleValidationErrors, incomeReportController.getIncomeAuditSummary);

router.delete('/', 
    authenticateToken, 
    checkPermission('delete:reports'), 
    [
        // Menggunakan query string lebih umum untuk DELETE
        query('hotel_id').isInt().withMessage('Hotel ID harus berupa angka.'),
        query('start_date').isISO8601().withMessage('Format tanggal awal tidak valid.'),
        query('end_date').isISO8601().withMessage('Format tanggal akhir tidak valid.')
    ],
    handleValidationErrors,
    incomeReportController.deleteIncomeReportsByDateRange);

module.exports = router;