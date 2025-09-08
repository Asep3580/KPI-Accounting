const express = require('express');
const bcrypt = require('bcryptjs'); // STANDARISASI: Menggunakan bcryptjs
const pool = require('../config/db'); // PATH DIPERBAIKI: Menunjuk ke file koneksi DB yang benar
const { check, validationResult } = require('express-validator');

// Impor middleware yang diperlukan
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const router = express.Router();

// --- VALIDATORS ---
// Middleware untuk validasi input dari frontend
const validateUserInput = [
    check('username', 'Username harus diisi').not().isEmpty(),
    check('email', 'Format email tidak valid').isEmail(),
    check('password', 'Password minimal 6 karakter').isLength({ min: 6 }),
    check('role_id', 'Role harus dipilih').isInt(),
    check('hotel_ids', 'Akses hotel harus berupa array').optional().isArray()
];

// Middleware untuk validasi input saat update
const validateUserUpdate = [
    check('username', 'Username harus diisi').optional().not().isEmpty(),
    check('email', 'Format email tidak valid').optional().isEmail(),
    check('password', 'Password minimal 6 karakter').optional({ checkFalsy: true }).isLength({ min: 6 }),
    check('role_id', 'Role harus dipilih').optional().isInt(),
    check('hotel_ids', 'Akses hotel harus berupa array').optional().isArray()
];


// --- ROUTES ---

/**
 * @route   GET /api/users
 * @desc    Mengambil semua data pengguna. INI ADALAH ROUTE YANG HILANG.
 * @access  Private (memerlukan izin 'view:users')
 */
router.get('/', [authenticateToken, checkPermission('view:users')], async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.username, u.full_name, u.email, u.is_active,
                r.id as role_id, r.name as role_name,
                COALESCE(
                    (SELECT string_agg(h.name, ', ') FROM user_hotels uh JOIN hotels h ON uh.hotel_id = h.id WHERE uh.user_id = u.id),
                    'Semua'
                ) as hotel_names
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.full_name;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error saat mengambil data pengguna:', error);
        res.status(500).send('Server error');
    }
});

/**
 * @route   GET /api/users/:id
 * @desc    Mengambil data satu pengguna berdasarkan ID
 * @access  Private (memerlukan izin 'view:users')
 */
router.get('/:id', [authenticateToken, checkPermission('view:users')], async (req, res) => {
    // TODO: Implementasi untuk mengambil satu pengguna, termasuk hotel_ids dalam bentuk array
    // Ini diperlukan untuk form edit pengguna.
    const { id } = req.params;
    try {
        // 1. Ambil detail dasar pengguna
        const userQuery = `
            SELECT 
                u.id, u.username, u.full_name, u.email, u.is_active,
                r.id as role_id, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1;
        `;
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        }

        const user = userResult.rows[0];

        // 2. Ambil ID hotel yang terhubung dengan pengguna
        const hotelQuery = `
            SELECT hotel_id FROM user_hotels WHERE user_id = $1;
        `;
        const hotelResult = await pool.query(hotelQuery, [id]);
        
        // 3. Gabungkan hasil: ubah [{hotel_id: 1}, {hotel_id: 5}] menjadi [1, 5]
        user.hotel_ids = hotelResult.rows.map(row => row.hotel_id);

        res.json(user);
    } catch (error) {
        console.error(`Error saat mengambil data pengguna dengan ID ${id}:`, error);
        res.status(500).send('Server error');
    }
});


/**
 * @route   POST /api/users
 * @desc    Membuat pengguna baru beserta hak akses hotelnya.
 * @access  Private (diasumsikan ada middleware otentikasi & otorisasi)
 */
router.post('/', [authenticateToken, checkPermission('create:users'), ...validateUserInput], async (req, res) => {
    // Cek hasil validasi
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, full_name, email, role_id, hotel_ids } = req.body;

    // Mengambil koneksi dari pool
    const client = await pool.connect();

    try {
        // 1. Hash password sebelum disimpan
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 2. Memulai DATABASE TRANSACTION
        await client.query('BEGIN');

        // 3. Insert data ke tabel 'users' dan dapatkan ID pengguna yang baru dibuat
        const userInsertQuery = `
            INSERT INTO users (username, password_hash, full_name, email, role_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const userResult = await client.query(userInsertQuery, [username, password_hash, full_name, email, role_id]);
        const newUserId = userResult.rows[0].id;

        // 4. Jika ada hotel_ids yang dikirim, insert ke tabel 'user_hotels'
        if (hotel_ids && hotel_ids.length > 0) {
            // Menggunakan UNNEST untuk efisiensi saat insert banyak baris
            const hotelAssignmentQuery = `
                INSERT INTO user_hotels (user_id, hotel_id)
                SELECT $1, hotel_id FROM unnest($2::int[]) AS hotel_id;
            `;
            await client.query(hotelAssignmentQuery, [newUserId, hotel_ids]);
        }

        // 5. Jika semua query berhasil, COMMIT transaksi
        await client.query('COMMIT');

        // 6. Ambil data lengkap pengguna yang baru dibuat untuk dikirim kembali ke frontend
        const finalUserQuery = `
            SELECT 
                u.id, u.username, u.full_name, u.email, u.is_active,
                r.id as role_id, r.name as role_name,
                COALESCE(
                    (SELECT string_agg(h.name, ', ') FROM user_hotels uh JOIN hotels h ON uh.hotel_id = h.id WHERE uh.user_id = u.id),
                    'Semua'
                ) as hotel_names
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1;
        `;
        const finalUserResult = await client.query(finalUserQuery, [newUserId]);
        
        res.status(201).json(finalUserResult.rows[0]);

    } catch (error) {
        // 7. Jika terjadi error, batalkan semua perubahan dengan ROLLBACK
        await client.query('ROLLBACK');
        console.error('Error saat membuat pengguna baru:', error);

        // Cek jika error karena duplikasi username atau email (unique constraint)
        if (error.code === '23505') { // Kode error PostgreSQL untuk 'unique_violation'
            const DUP_MESSAGE = error.constraint.includes('username') 
                ? 'Username sudah digunakan.' 
                : 'Email sudah terdaftar.';
            return res.status(400).json({ msg: DUP_MESSAGE });
        }
        
        res.status(500).send('Server error');
    } finally {
        // 8. Selalu lepaskan koneksi client kembali ke pool
        client.release();
    }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Memperbarui data pengguna dan hak akses hotelnya.
 * @access  Private (memerlukan izin 'edit:users')
 */
router.put('/:id', [authenticateToken, checkPermission('edit:users'), ...validateUserUpdate], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { username, password, full_name, email, role_id, hotel_ids } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (username !== undefined) { updateFields.push(`username = $${paramIndex++}`); updateValues.push(username); }
        if (full_name !== undefined) { updateFields.push(`full_name = $${paramIndex++}`); updateValues.push(full_name); }
        if (email !== undefined) { updateFields.push(`email = $${paramIndex++}`); updateValues.push(email); }
        if (role_id !== undefined) { updateFields.push(`role_id = $${paramIndex++}`); updateValues.push(role_id); }
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            updateFields.push(`password_hash = $${paramIndex++}`);
            updateValues.push(password_hash);
        }

        if (updateFields.length > 0) {
            updateValues.push(id);
            const userUpdateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
            await client.query(userUpdateQuery, updateValues);
        }

        if (hotel_ids !== undefined) {
            await client.query('DELETE FROM user_hotels WHERE user_id = $1', [id]);
            if (hotel_ids.length > 0) {
                const hotelAssignmentQuery = `INSERT INTO user_hotels (user_id, hotel_id) SELECT $1, hotel_id FROM unnest($2::int[]) AS hotel_id;`;
                await client.query(hotelAssignmentQuery, [id, hotel_ids]);
            }
        }

        await client.query('COMMIT');

        const finalUserQuery = `
            SELECT u.id, u.username, u.full_name, u.email, u.is_active, r.id as role_id, r.name as role_name,
                   COALESCE((SELECT string_agg(h.name, ', ') FROM user_hotels uh JOIN hotels h ON uh.hotel_id = h.id WHERE uh.user_id = u.id), 'Semua') as hotel_names
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1;
        `;
        const finalUserResult = await client.query(finalUserQuery, [id]);

        if (finalUserResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Pengguna tidak ditemukan.' });
        }

        res.json(finalUserResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saat memperbarui pengguna:', error);
        if (error.code === '23505') {
            const DUP_MESSAGE = error.constraint.includes('username') ? 'Username sudah digunakan.' : 'Email sudah terdaftar.';
            return res.status(400).json({ msg: DUP_MESSAGE });
        }
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Menghapus pengguna
 * @access  Private (memerlukan izin 'delete:users')
 */
router.delete('/:id', [authenticateToken, checkPermission('delete:users')], async (req, res) => {
    // TODO: Implementasi untuk menghapus pengguna
    res.status(501).json({ msg: 'Not Implemented' });
});

module.exports = router;