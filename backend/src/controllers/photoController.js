const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const createError = require('http-errors');
const fs = require('fs');
const path = require('path');

/**
 * @route   POST /api/audit-results/:resultId/photos
 * @desc    Unggah foto untuk sebuah item checklist audit
 * @access  Private
 */
exports.uploadAuditPhoto = asyncHandler(async (req, res) => {
    const { resultId } = req.params;
    const { description } = req.body;
    const uploaded_by_user_id = req.user.id;

    if (!req.file) {
        throw createError(400, 'Tidak ada file yang diunggah.');
    }

    const { filename, mimetype, size } = req.file;
    const relativePath = path.join('uploads/audit-photos', filename).replace(/\\/g, '/');

    const query = `
        INSERT INTO audit_photos (audit_result_id, uploaded_by_user_id, file_path, file_name, mime_type, file_size, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;

    const { rows } = await pool.query(query, [resultId, uploaded_by_user_id, relativePath, filename, mimetype, size, description]);

    res.status(201).json({
        message: 'Foto berhasil diunggah.',
        photo: rows[0]
    });
});

/**
 * @route   GET /api/audit-results/:resultId/photos
 * @desc    Ambil semua foto untuk sebuah item checklist audit
 * @access  Private
 */
exports.getPhotosForResult = asyncHandler(async (req, res) => {
    const { resultId } = req.params;
    const { rows } = await pool.query('SELECT * FROM audit_photos WHERE audit_result_id = $1 ORDER BY created_at DESC', [resultId]);
    res.status(200).json(rows);
});

/**
 * @route   DELETE /api/photos/:photoId
 * @desc    Hapus sebuah foto audit
 * @access  Private
 */
exports.deleteAuditPhoto = asyncHandler(async (req, res) => {
    const { photoId } = req.params;

    const findResult = await pool.query('SELECT file_path FROM audit_photos WHERE id = $1', [photoId]);
    if (findResult.rows.length === 0) {
        throw createError(404, 'Foto tidak ditemukan.');
    }

    await pool.query('DELETE FROM audit_photos WHERE id = $1', [photoId]);

    const absolutePath = path.resolve(findResult.rows[0].file_path);
    fs.unlink(absolutePath, (err) => {
        if (err) {
            console.error(`Gagal menghapus file fisik: ${absolutePath}`, err);
        }
    });

    res.status(200).json({ message: 'Foto berhasil dihapus.' });
});