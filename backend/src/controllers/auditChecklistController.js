const pool = require('../config/db'); // Pastikan path ini benar

/**
 * @desc    Get all checklist items by audit type
 * @route   GET /api/audit-checklist/by-type/:auditTypeId
 * @access  Private (Authenticated)
 */
const getChecklistsByAuditType = async (req, res) => {
    const { auditTypeId } = req.params;
    try {
        const { rows } = await pool.query(
            'SELECT * FROM audit_checklist_items WHERE audit_type_id = $1 ORDER BY id',
            [auditTypeId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error in getChecklistsByAuditType:', err.message);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil hasil checklist.' });
    }
};

/**
 * @desc    Create a new checklist item
 * @route   POST /api/audit-checklist
 * @access  Private (Admin)
 */
const createChecklistItem = async (req, res) => {
    const { audit_type_id, item_text } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO audit_checklist_items (audit_type_id, item_text) VALUES ($1, $2) RETURNING *',
            [audit_type_id, item_text]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error in createChecklistItem:', err.message);
        res.status(500).json({ message: 'Gagal membuat item checklist baru.' });
    }
};

/**
 * @desc    Update a checklist item
 * @route   PUT /api/audit-checklist/:id
 * @access  Private (Admin)
 */
const updateChecklistItem = async (req, res) => {
    const { id } = req.params;
    const { item_text } = req.body;
    try {
        const { rows, rowCount } = await pool.query(
            'UPDATE audit_checklist_items SET item_text = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [item_text, id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Item checklist tidak ditemukan.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error in updateChecklistItem:', err.message);
        res.status(500).json({ message: 'Gagal memperbarui item checklist.' });
    }
};

/**
 * @desc    Delete a checklist item
 * @route   DELETE /api/audit-checklist/:id
 * @access  Private (Admin)
 */
const deleteChecklistItem = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await pool.query('DELETE FROM audit_checklist_items WHERE id = $1', [id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Item checklist tidak ditemukan.' });
        }
        res.status(204).send(); // 204 No Content
    } catch (err) {
        console.error('Error in deleteChecklistItem:', err.message);
        res.status(500).json({ message: 'Gagal menghapus item checklist.' });
    }
};

module.exports = {
    getChecklistsByAuditType,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
};