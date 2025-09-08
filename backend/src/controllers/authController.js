const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * @desc    Menangani login pengguna dan membuat token JWT yang lengkap
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ msg: 'Mohon masukkan username dan password.' });
    }

    try {
        // 1. Mengambil data pengguna BESERTA informasi perannya (role)
        const query = `
            SELECT 
                u.id, u.username, u.password_hash, u.full_name, 
                r.id as role_id, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.username = $1;
        `;
        const result = await pool.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(400).json({ msg: 'Username atau password salah.' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Username atau password salah.' });
        }

        // 2. Membuat payload untuk token JWT dengan informasi yang lengkap
        const payload = {
            id: user.id,
            username: user.username,
            role_id: user.role_id,   // <-- PENTING
            role_name: user.role_name // <-- PENTING
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });

    } catch (error) {
        console.error('Error saat login:', error);
        res.status(500).send('Server error');
    }
};