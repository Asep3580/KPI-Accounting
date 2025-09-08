const pool = require('../config/db');

/**
 * @route   GET /api/agendas/:agendaId/results
 * @desc    Mengambil semua hasil checklist untuk sebuah agenda
 * @access  Private
 */
const getResultsByAgenda = async (req, res) => {
    const { agendaId } = req.params;
    try {
        const { rows } = await pool.query(
            'SELECT checklist_item_id, is_checked, notes FROM audit_results WHERE agenda_id = $1',
            [agendaId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching audit results:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

/**
 * @route   PUT /api/agendas/:agendaId/results
 * @desc    Menyimpan (upsert) semua hasil checklist untuk sebuah agenda
 * @access  Private
 */
const saveResultsForAgenda = async (req, res) => {
    const { agendaId } = req.params;
    const results = req.body.results; // Diharapkan berupa array: [{ checklist_item_id, is_checked, notes }]

    if (!Array.isArray(results)) {
        return res.status(400).json({ message: 'Format data tidak valid. Diperlukan sebuah array "results".' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Hapus hasil lama untuk agenda ini untuk menyederhanakan proses upsert
        await client.query('DELETE FROM audit_results WHERE agenda_id = $1', [agendaId]);

        // Masukkan hasil yang baru
        for (const result of results) {
            const { checklist_item_id, is_checked, notes } = result;
            await client.query(
                'INSERT INTO audit_results (agenda_id, checklist_item_id, is_checked, notes) VALUES ($1, $2, $3, $4)',
                [agendaId, checklist_item_id, is_checked, notes || null]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Checklist berhasil disimpan.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving audit results:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan checklist.' });
    } finally {
        client.release();
    }
};

module.exports = {
    getResultsByAgenda,
    saveResultsForAgenda,
};