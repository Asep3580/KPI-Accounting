const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Controller untuk mengambil semua data pengguna beserta rolenya.
 * Fungsi ini hanya akan dijalankan jika middleware otentikasi dan otorisasi berhasil.
 */
const getAllUsers = async (req, res) => {
    try {
        // Query untuk mengambil data user dan menggabungkannya dengan nama role
        // Kolom password_hash sengaja tidak diambil untuk keamanan
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                u.email, 
                u.is_active,
                u.created_at,
                r.name as role_name 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.is_active = true
            ORDER BY u.created_at DESC;
        `;
        const { rows } = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil data pengguna.' });
    }
};

/**
 * Controller untuk membuat pengguna baru.
 */
const createUser = async (req, res) => {
    const { username, password, full_name, email, role_id } = req.body;

    if (!username || !password || !full_name || !email || !role_id) {
        return res.status(400).json({ message: 'Semua field harus diisi: username, password, full_name, email, role_id.' });
    }

    try {
        // Hash password sebelum disimpan
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (username, password_hash, full_name, email, role_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, full_name, email, created_at;
        `;
        const values = [username, password_hash, full_name, email, role_id];

        const { rows } = await pool.query(query, values);
        res.status(201).json({ message: 'Pengguna berhasil dibuat.', user: rows[0] });
    } catch (error) {
        console.error('Error creating user:', error);
        // Cek jika error karena duplikat email atau username
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(409).json({ message: `Pengguna dengan ${error.constraint.includes('email') ? 'email' : 'username'} tersebut sudah ada.` });
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * Controller untuk mengambil satu pengguna berdasarkan ID.
 */
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT id, username, full_name, email, role_id, is_active FROM users WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Error fetching user with id ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * Controller untuk memperbarui data pengguna.
 */
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role_id, is_active } = req.body;

    // Validasi dasar
    if (full_name === undefined || email === undefined || role_id === undefined || is_active === undefined) {
        return res.status(400).json({ message: 'Field yang diperlukan (full_name, email, role_id, is_active) tidak lengkap.' });
    }

    try {
        const query = `
            UPDATE users 
            SET full_name = $1, email = $2, role_id = $3, is_active = $4
            WHERE id = $5
            RETURNING id, username, full_name, email, role_id, is_active;
        `;
        const values = [full_name, email, role_id, is_active, id];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Data pengguna berhasil diperbarui.', user: rows[0] });
    } catch (error) {
        console.error(`Error updating user with id ${id}:`, error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Email atau username sudah digunakan oleh pengguna lain.' });
        }
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * Controller untuk menghapus (menonaktifkan) pengguna. Ini adalah "soft delete".
 */
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `UPDATE users SET is_active = false WHERE id = $1 RETURNING id;`;
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Pengguna berhasil dinonaktifkan.' });
    } catch (error) {
        console.error(`Error deactivating user with id ${id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * Controller untuk pengguna mengubah password mereka sendiri.
 */
const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // Diambil dari token JWT yang valid

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Password lama dan password baru harus diisi.' });
    }

    try {
        // 1. Ambil hash password saat ini dari database
        const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        const user = rows[0];

        // 2. Bandingkan password lama dengan hash di database
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password lama salah.' });
        }

        // 3. Hash password baru dan update ke database
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

        res.status(200).json({ message: 'Password berhasil diubah.' });
    } catch (error) {
        console.error(`Error changing password for user id ${userId}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    changePassword,
};