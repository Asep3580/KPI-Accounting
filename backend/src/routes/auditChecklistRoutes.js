const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const {
    getChecklistsByAuditType,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} = require('../controllers/auditChecklistController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Middleware untuk menangani error validasi secara terpusat
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Rute untuk mengambil checklist berdasarkan tipe audit (bisa diakses semua role yang terotentikasi)
router.get(
    '/by-type/:auditTypeId',
    authenticateToken,
    [param('auditTypeId').isInt().withMessage('Audit Type ID harus berupa angka.')],
    handleValidationErrors,
    getChecklistsByAuditType
);

// Rute Create, Update, Delete yang memerlukan hak akses Admin
router.post(
    '/',
    authenticateToken,
    checkPermission('edit:audit-checklists'),
    [
        body('audit_type_id').isInt({ min: 1 }).withMessage('Audit Type ID harus berupa angka yang valid.'),
        body('item_text').trim().notEmpty().withMessage('Teks checklist tidak boleh kosong.'),
    ],
    handleValidationErrors,
    createChecklistItem
);

router.put(
    '/:id',
    authenticateToken,
    checkPermission('edit:audit-checklists'),
    [
        param('id').isInt({ min: 1 }).withMessage('ID Checklist harus berupa angka.'),
        body('item_text').optional().trim().notEmpty().withMessage('Teks checklist tidak boleh kosong.'),
    ],
    handleValidationErrors,
    updateChecklistItem
);

router.delete(
    '/:id',
    authenticateToken,
    checkPermission('delete:audit-checklists'),
    [param('id').isInt({ min: 1 }).withMessage('ID Checklist harus berupa angka.')],
    handleValidationErrors,
    deleteChecklistItem
);

module.exports = router;