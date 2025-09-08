const pool = require('../config/db');

/**
 * GET /api/audit-types - Mendapatkan semua tipe audit
 */
const getAllAuditTypes = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM audit_types ORDER BY name ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching audit types:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * POST /api/audit-types - Membuat tipe audit baru
 */
const createAuditType = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama tipe audit harus diisi.' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO audit_types (name, description) VALUES ($1, $2) RETURNING *',
            [name, description || null]
        );
        res.status(201).json({ message: 'Tipe audit berhasil ditambahkan.', auditType: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Tipe audit dengan nama tersebut sudah ada.' });
        }
        console.error('Error creating audit type:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * PUT /api/audit-types/:id - Memperbarui tipe audit
 */
const updateAuditType = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Nama tipe audit harus diisi.' });
    }

    try {
        const { rows } = await pool.query(
            'UPDATE audit_types SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [name, description || null, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Tipe audit tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Tipe audit berhasil diperbarui.', auditType: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Tipe audit dengan nama tersebut sudah ada.' });
        }
        console.error('Error updating audit type:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * DELETE /api/audit-types/:id - Menghapus tipe audit
 */
const deleteAuditType = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM audit_types WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Tipe audit tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Tipe audit berhasil dihapus.' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ message: 'Tipe audit tidak dapat dihapus karena masih digunakan oleh item checklist.' });
        }
        console.error('Error deleting audit type:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { getAllAuditTypes, createAuditType, updateAuditType, deleteAuditType };