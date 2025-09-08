const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler'); // Assuming this exists
const createError = require('http-errors'); // For creating standard HTTP errors

// This is an assumed implementation based on your frontend code.
exports.getAgendas = asyncHandler(async (req, res) => {
    // The original query likely failed because the 'agendas' table does not have a 'created_at' column.
    // This updated query removes that column and improves performance by replacing the subquery with a LEFT JOIN.
    const query = `
            SELECT 
                a.id,
                a.start_time as "start",
                a.end_time as "end",
                a.description,
                a.color,
                a.status,
                a.audit_type_id,
                a.hotel_id,
                h.name as hotel_name,
                COALESCE(u.full_name, 'Tidak Ditugaskan') as auditor_name,
                at.name as audit_type_name
            FROM agendas a
            JOIN hotels h ON a.hotel_id = h.id
            LEFT JOIN users u ON a.auditor_id = u.id
            LEFT JOIN audit_types at ON a.audit_type_id = at.id
            ORDER BY a.start_time DESC;
        `;
    const { rows } = await pool.query(query);

    const transformedRows = rows.map(row => ({
        id: row.id,
        title: `Audit ${row.audit_type_name || 'Umum'}: ${row.hotel_name}`,
        start: row.start,
        end: row.end,
        color: row.color,
        // Pass original data through extendedProps for use in modals/tables
        extendedProps: {
            description: row.description,
            status: row.status,
            hotel_id: row.hotel_id,
            audit_type_id: row.audit_type_id,
            auditor_name: row.auditor_name,
            // Add start time here as well for the recent activity fallback
            start: row.start
        }
    }));

    res.json(transformedRows);
});

exports.createAgenda = asyncHandler(async (req, res) => {
    const { hotel_id, start, end, description, color, status, audit_type_id } = req.body;
    const auditor_id = req.user.id;

    const query = `
            INSERT INTO agendas (hotel_id, auditor_id, start_time, end_time, description, color, status, audit_type_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
    const { rows } = await pool.query(query, [hotel_id, auditor_id, start, end, description, color, status, audit_type_id]);
    res.status(201).json({ message: 'Agenda berhasil dibuat.', agenda: rows[0] });
});

exports.deleteAgenda = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM audit_results WHERE agenda_id = $1', [id]);
    const result = await pool.query('DELETE FROM agendas WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        throw createError(404, 'Agenda tidak ditemukan.');
    }
    res.status(200).json({ message: 'Agenda berhasil dihapus.' });
});

exports.getAgendaMetrics = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT status, COUNT(*) as count FROM agendas GROUP BY status;`);
    const metrics = { scheduled: 0, completed: 0, in_progress: 0 };
    rows.forEach(row => {
        if (row.status === 'Terjadwal') metrics.scheduled = parseInt(row.count, 10);
        if (row.status === 'Selesai') metrics.completed = parseInt(row.count, 10);
        if (row.status === 'Sedang Proses') metrics.in_progress = parseInt(row.count, 10);
    });
    res.json(metrics);
});

exports.saveChecklistResults = asyncHandler(async (req, res) => {
    const { id } = req.params; // agenda_id
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
        throw createError(400, 'Data hasil tidak valid.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM audit_results WHERE agenda_id = $1', [id]);

        const insertPromises = results.map(result => {
            const query = 'INSERT INTO audit_results (agenda_id, checklist_item_id, is_checked, comment) VALUES ($1, $2, $3, $4)';
            return client.query(query, [id, result.checklist_item_id, result.is_checked, result.comment]);
        });
        await Promise.all(insertPromises);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Hasil checklist berhasil disimpan.' });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error; // Re-throw the error to be caught by asyncHandler
    } finally {
        client.release();
    }
});

exports.updateAgendaStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) throw createError(400, 'Status harus diisi.');

    const { rows } = await pool.query('UPDATE agendas SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (rows.length === 0) {
        throw createError(404, 'Agenda tidak ditemukan.');
    }
    res.status(200).json({ message: `Status agenda berhasil diubah menjadi "${status}".` });
});

/**
 * @route   GET /api/agendas/:id/results
 * @desc    Mengambil hasil checklist untuk sebuah agenda, digabung dengan master checklist.
 * @access  Private
 */
exports.getChecklistResults = asyncHandler(async (req, res) => {
    const { id } = req.params; // agenda_id

    const query = `
        SELECT
            aci.id,
            aci.item_text,
            aci.category,
            aci.audit_type_id,
            ar.is_checked,
                ar.comment,
                ar.id as result_id -- Menambahkan ID dari hasil audit untuk fitur foto
        FROM agendas a
        JOIN audit_checklist_items aci ON a.audit_type_id = aci.audit_type_id
        LEFT JOIN audit_results ar ON aci.id = ar.checklist_item_id AND ar.agenda_id = a.id
        WHERE a.id = $1
        ORDER BY aci.category, aci.id;
    `;
    const { rows } = await pool.query(query, [id]);
    res.json(rows);
});