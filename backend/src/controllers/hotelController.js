const pool = require('../config/db');

/**
 * GET /api/hotels - Mendapatkan semua data hotel
 */
const getAllHotels = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM hotels ORDER BY name ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat mengambil data hotel.' });
    }
};

/**
 * POST /api/hotels - Membuat hotel baru
 */
const createHotel = async (req, res) => {
    const { name, address } = req.body;
    if (!name || !address) {
        return res.status(400).json({ message: 'Nama dan alamat hotel harus diisi.' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO hotels (name, address) VALUES ($1, $2) RETURNING *',
            [name, address]
        );
        res.status(201).json({ message: 'Hotel berhasil ditambahkan.', hotel: rows[0] });
    } catch (error) {
        // Menangani error jika nama hotel sudah ada (jika ada unique constraint)
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Hotel dengan nama tersebut sudah ada.' });
        }
        console.error('Error creating hotel:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * PUT /api/hotels/:id - Memperbarui data hotel
 */
const updateHotel = async (req, res) => {
    const { id } = req.params;
    const { name, address } = req.body;

    if (!name || !address) {
        return res.status(400).json({ message: 'Nama dan alamat hotel harus diisi.' });
    }

    try {
        const { rows } = await pool.query(
            'UPDATE hotels SET name = $1, address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, address, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Hotel tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Data hotel berhasil diperbarui.', hotel: rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Hotel dengan nama tersebut sudah ada.' });
        }
        console.error('Error updating hotel:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * DELETE /api/hotels/:id - Menghapus hotel
 */
const deleteHotel = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM hotels WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Hotel tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Hotel berhasil dihapus.' });
    } catch (error) {
        // Menangani error jika hotel masih terhubung dengan data lain (misal: agenda)
        if (error.code === '23503') {
            return res.status(409).json({ message: 'Hotel tidak dapat dihapus karena masih digunakan di data lain (misalnya, agenda visit).' });
        }
        console.error('Error deleting hotel:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { getAllHotels, createHotel, updateHotel, deleteHotel };