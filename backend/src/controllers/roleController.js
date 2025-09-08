const pool = require('../config/db');

// Daftar nama peran yang dilindungi dari modifikasi atau penghapusan (case-insensitive)
const PROTECTED_ROLES = ['admin', 'staff audit', 'staff hotel'];

/**
 * GET /api/roles - Mendapatkan semua peran
 */
const getAllRoles = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM roles ORDER BY name ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil data peran.' });
    }
};

/**
 * POST /api/roles - Membuat peran baru
 */
const createRole = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama peran harus diisi.' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO roles (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.status(201).json({ message: 'Peran berhasil dibuat.', role: rows[0] });
    } catch (error) {
        if (error.code === '23505') { // unique_violation
            return res.status(409).json({ message: 'Nama peran tersebut sudah ada.' });
        }
        console.error('Error creating role:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * PUT /api/roles/:id - Memperbarui peran
 */
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Nama peran harus diisi.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [id]);
        if (roleResult.rows.length === 0) {
            return res.status(404).json({ message: 'Peran tidak ditemukan.' });
        }

        if (PROTECTED_ROLES.includes(roleResult.rows[0].name.toLowerCase())) {
            return res.status(403).json({ message: 'Peran sistem tidak dapat diubah.' });
        }

        const { rows } = await client.query('UPDATE roles SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Peran berhasil diperbarui.', role: rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') return res.status(409).json({ message: 'Nama peran tersebut sudah ada.' });
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    } finally {
        client.release();
    }
};

/**
 * DELETE /api/roles/:id - Menghapus peran
 */
const deleteRole = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [id]);
        if (roleResult.rows.length === 0) return res.status(404).json({ message: 'Peran tidak ditemukan.' });

        if (PROTECTED_ROLES.includes(roleResult.rows[0].name.toLowerCase())) {
            return res.status(403).json({ message: 'Peran sistem tidak dapat dihapus.' });
        }

        await client.query('DELETE FROM roles WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Peran berhasil dihapus.' });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23503') return res.status(409).json({ message: 'Peran tidak dapat dihapus karena masih digunakan oleh pengguna.' });
        console.error('Error deleting role:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    } finally {
        client.release();
    }
};

/**
 * GET /api/roles/:id/permissions - Mendapatkan hak akses untuk role tertentu
 */
const getRolePermissions = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT permission_id FROM role_permissions WHERE role_id = $1;`;
        const { rows } = await pool.query(query, [id]);
        // Kirim array berisi ID permission saja untuk kemudahan di frontend
        res.status(200).json(rows.map(p => p.permission_id));
    } catch (error) {
        console.error(`Error fetching permissions for role ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * PUT /api/roles/:id/permissions - Memperbarui hak akses untuk role tertentu
 */
const updateRolePermissions = async (req, res) => {
    const { id } = req.params;
    const { permissionIds } = req.body; // Berupa array of permission IDs

    if (!Array.isArray(permissionIds)) {
        return res.status(400).json({ message: 'permissionIds harus berupa array.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Hapus semua permission lama untuk role ini
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // 2. Jika ada permission baru yang dikirim, masukkan satu per satu
        if (permissionIds.length > 0) {
            const insertQuery = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)';
            for (const permissionId of permissionIds) {
                await client.query(insertQuery, [id, permissionId]);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Hak akses peran berhasil diperbarui.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error updating permissions for role ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    } finally {
        client.release();
    }
};

module.exports = { getAllRoles, createRole, updateRole, deleteRole, getRolePermissions, updateRolePermissions };