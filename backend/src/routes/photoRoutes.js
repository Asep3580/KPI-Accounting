const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadAuditPhoto, getPhotosForResult, deleteAuditPhoto } = require('../controllers/photoController');

// Middleware untuk menangani error validasi
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// Rute untuk mengunggah foto baru untuk hasil audit tertentu
// 'photo' adalah nama field dari form-data yang harus dikirim dari frontend
router.post(
    '/audit-results/:resultId/photos',
    authenticateToken,
    checkPermission('submit:audit'), // Gunakan permission yang sesuai
    upload.single('photo'),
    [param('resultId').isInt().withMessage('Result ID harus berupa angka.')],
    handleValidationErrors,
    uploadAuditPhoto
);

// Rute untuk mendapatkan semua foto untuk hasil audit tertentu
router.get(
    '/audit-results/:resultId/photos',
    authenticateToken,
    checkPermission('view:audit-results'), // Gunakan permission yang sesuai
    [param('resultId').isInt().withMessage('Result ID harus berupa angka.')],
    handleValidationErrors,
    getPhotosForResult
);

// Rute untuk menghapus foto berdasarkan ID foto
router.delete(
    '/photos/:photoId',
    authenticateToken,
    checkPermission('delete:audit-photo'), // Buat permission baru jika perlu
    [param('photoId').isInt().withMessage('Photo ID harus berupa angka.')],
    handleValidationErrors,
    deleteAuditPhoto
);

module.exports = router;