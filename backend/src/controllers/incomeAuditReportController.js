const pool = require('../config/db');
const { validationResult } = require('express-validator');

/**
 * Konversi header dari Excel (e.g., "Room Revenue") ke nama kolom di database (e.g., "room_revenue").
 * @param {string} header - Header dari Excel.
 * @returns {string} Nama kolom database.
 */
const mapHeaderToDbColumn = (header) => {
    if (!header) return null;
    const lowerHeader = header.toLowerCase();
    // Explicitly map the excel 'date' header to the 'report_date' db column
    if (lowerHeader === 'date') {
        return 'report_date';
    }
    // Explicitly map "Room Com & HU" to "room_com_hu" to avoid creating "room_com_and_hu"
    if (lowerHeader === 'room com & hu') {
        return 'room_com_hu';
    }
    // Explicitly map "%Occp" to "occp_percent"
    if (lowerHeader === '%occp') {
        return 'occp_percent';
    }
    return lowerHeader
        .replace(/&/g, 'and') // Replace '&' with 'and'
        .replace(/%/g, 'percent') // Replace '%' with 'percent'
        .replace(/ /g, '_') // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, ''); // Remove any other non-alphanumeric characters
};

/**
 * Menerima data laporan Income Audit dalam jumlah besar (bulk) dan menyimpannya ke database.
 * Ini akan menghapus data lama untuk hotel dan tanggal yang sama sebelum memasukkan data baru.
 */
exports.createBulkIncomeReports = async (req, res) => {
    const { hotel_id, reports } = req.body;

    // Validasi input dasar
    if (!hotel_id || !Array.isArray(reports) || reports.length === 0) {
        return res.status(400).json({ message: 'Data tidak valid. hotel_id dan array reports dibutuhkan.' });
    }

    // Robustly find the date from the first report object, case-insensitively.
    const firstReportKeys = Object.keys(reports[0]);
    const dateKey = firstReportKeys.find(key => key.toLowerCase() === 'date');

    if (!dateKey) {
        return res.status(400).json({ message: 'Kolom "DATE" tidak ditemukan di header file Excel.' });
    }

    // FIX: The dates are now pre-formatted YYYY-MM-DD strings.
    // The logic can be simplified to work with strings directly.
    const dates = reports.map(r => r[dateKey]).filter(Boolean);
    if (dates.length === 0) {
        return res.status(400).json({ message: 'Tidak ada tanggal valid yang ditemukan dalam data laporan.' });
    }
    const minDateStr = dates.reduce((a, b) => (a < b ? a : b));
    const maxDateStr = dates.reduce((a, b) => (a > b ? a : b));

    // Define the list of columns that are actually in the database table.
    // This prevents attempts to insert calculated columns like 'occp_percent', 'arr', etc.
    const insertableDbColumns = [
        'hotel_id', 'report_date', 'description', 'room_available', 'room_ooo', 'room_com_hu',
        'room_sold', 'number_of_guest', 'lodging_revenue', 'others_room_revenue', 'room_revenue',
        'breakfast_revenue', 'restaurant_revenue', 'room_service', 'banquet_revenue', 'fnb_others',
        'fnb_revenue', 'others_revenue', 'total_revenue', 'service', 'tax', 'gross_revenue',
        'shared_payable', 'deposit_reservation', 'cash_fo', 'cash_outlet', 'bank_transfer',
        'qris', 'credit_debit_card', 'city_ledger', 'total_settlement', 'gab', 'balance'
    ];

    const client = await pool.connect();

    try {
        // Optimization: Create a map for faster header lookups inside the loop
        const headers = Object.keys(reports[0]);
        const dbToHeaderMap = new Map();
        for (const header of headers) {
            dbToHeaderMap.set(mapHeaderToDbColumn(header), header);
        }

        // --- Transactional Logic ---
        await client.query('BEGIN');

        // 1. Hapus data lama untuk hotel dan tanggal yang sama untuk mencegah duplikasi
        const deleteQuery = 'DELETE FROM income_audit_reports WHERE hotel_id = $1 AND report_date BETWEEN $2 AND $3';
        await client.query(deleteQuery, [hotel_id, minDateStr, maxDateStr]);

        // 2. Siapkan query untuk insert data baru
        // Use the predefined list of insertable columns for the query
        const columnNames = insertableDbColumns.join(', ');

        const valuePlaceholders = [];
        const queryParams = [];
        let paramIndex = 1;
        
        for (const report of reports) {
            const rowValues = [];
            const rowPlaceholders = [];

            // Iterate over the predefined list of columns, not the excel headers
            for (const col of insertableDbColumns) {
                let value;
                if (col === 'hotel_id') {
                    value = hotel_id;
                } else if (col === 'report_date') {
                    // The date is already a correct 'YYYY-MM-DD' string from the frontend.
                    value = report[dateKey]; 
                } else {
                    // Find the original Excel header from the db column name
                    value = report[dbToHeaderMap.get(col)];
                }
                
                // Atasi nilai undefined atau null
                rowValues.push(value !== undefined ? value : null);
                rowPlaceholders.push(`$${paramIndex++}`);
            }
            
            queryParams.push(...rowValues);
            valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const insertQuery = `INSERT INTO income_audit_reports (${columnNames}) VALUES ${valuePlaceholders.join(', ')}`;
        
        await client.query(insertQuery, queryParams);

        // 3. Commit transaksi jika semua berhasil
        await client.query('COMMIT');

        res.status(201).json({ message: `Laporan dari tanggal ${minDateStr} hingga ${maxDateStr} berhasil disimpan.` });

    } catch (error) {
        // Jika terjadi error, batalkan semua perubahan
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
        console.error('Error during bulk income report insert:', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server saat menyimpan laporan.' });
    } finally {
        // Selalu lepaskan koneksi client
        client.release();
    }
};

/**
 * Helper function to build a period object (today, mtd, ytd) from a flat database row.
 * @param {object} row - The database row.
 * @param {string} periodPrefix - The prefix for the columns (e.g., 'today', 'mtd', 'ytd').
 * @returns {object} A structured object for the period.
 */
const buildPeriodObject = (row, periodPrefix) => {
    const parse = (val) => parseFloat(val || 0);
    return {
        room_available: parseInt(row[`${periodPrefix}_room_available`], 10),
        room_sold: parseInt(row[`${periodPrefix}_room_sold`], 10),
        occp_percent: parse(row[`${periodPrefix}_occp_percent`]),
        arr: parse(row[`${periodPrefix}_arr`]),
        room_revenue: parse(row[`${periodPrefix}_room_revenue`]),
        fnb_revenue: parse(row[`${periodPrefix}_fnb_revenue`]),
        others_revenue: parse(row[`${periodPrefix}_others_revenue`]), // Tetap others_revenue untuk konsistensi dengan query
        total_revenue: parse(row[`${periodPrefix}_total_revenue`]),
    };
};

/**
 * Mengambil data ringkasan Income Audit (Today, MTD, YTD) untuk semua hotel aktif.
 */
exports.getIncomeAuditSummary = async (req, res) => {
    const { hotel_id, start_date, end_date } = req.query;

    // Definisikan query SQL dengan Common Table Expressions (CTEs) untuk kejelasan
    // CTEs membantu memecah query kompleks menjadi bagian-bagian logis yang lebih kecil.
    let queryText = `
        WITH date_params AS (
            SELECT
                $1::date AS start_date,
                $2::date AS end_date,
                date_trunc('month', $2::date)::date AS end_date_month_start,
                date_trunc('year', $2::date)::date AS end_date_year_start
        ),
        aggregated_data AS (
            SELECT
                ir.hotel_id,
                -- "Period" aggregation is now "Today" (based on end_date)
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.room_available ELSE 0 END) AS period_room_available,
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.room_sold ELSE 0 END) AS period_room_sold,
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.room_revenue ELSE 0 END) AS period_room_revenue,
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.fnb_revenue ELSE 0 END) AS period_fnb_revenue,
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.others_revenue ELSE 0 END) AS period_others_revenue,
                SUM(CASE WHEN ir.report_date = dp.end_date THEN ir.total_revenue ELSE 0 END) AS period_total_revenue,

                -- MTD aggregation (now represents the selected period from start_date to end_date)
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.room_available ELSE 0 END) AS mtd_room_available,
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.room_sold ELSE 0 END) AS mtd_room_sold,
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.room_revenue ELSE 0 END) AS mtd_room_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.fnb_revenue ELSE 0 END) AS mtd_fnb_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.others_revenue ELSE 0 END) AS mtd_others_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.start_date AND dp.end_date THEN ir.total_revenue ELSE 0 END) AS mtd_total_revenue,

                -- YTD aggregation
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.room_available ELSE 0 END) AS ytd_room_available,
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.room_sold ELSE 0 END) AS ytd_room_sold,
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.room_revenue ELSE 0 END) AS ytd_room_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.fnb_revenue ELSE 0 END) AS ytd_fnb_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.others_revenue ELSE 0 END) AS ytd_others_revenue,
                SUM(CASE WHEN ir.report_date BETWEEN dp.end_date_year_start AND dp.end_date THEN ir.total_revenue ELSE 0 END) AS ytd_total_revenue
            FROM
                income_audit_reports ir, date_params dp
            WHERE
                ir.report_date <= dp.end_date AND ir.report_date >= dp.end_date_year_start
            GROUP BY
                ir.hotel_id
        )
        SELECT
            h.id AS hotel_id,
            h.name AS hotel_name,
            -- Period
            COALESCE(ad.period_room_available, 0)::int AS period_room_available,
            COALESCE(ad.period_room_sold, 0)::int AS period_room_sold,
            (CASE WHEN COALESCE(ad.period_room_available, 0) > 0 THEN (COALESCE(ad.period_room_sold, 0) * 100.0 / ad.period_room_available) ELSE 0 END) AS period_occp_percent,
            (CASE WHEN COALESCE(ad.period_room_sold, 0) > 0 THEN (ad.period_room_revenue / ad.period_room_sold) ELSE 0 END) AS period_arr,
            COALESCE(ad.period_room_revenue, 0) AS period_room_revenue,
            COALESCE(ad.period_fnb_revenue, 0) AS period_fnb_revenue,
            COALESCE(ad.period_others_revenue, 0) AS period_others_revenue,
            COALESCE(ad.period_total_revenue, 0) AS period_total_revenue,
            -- MTD
            COALESCE(ad.mtd_room_available, 0)::int AS mtd_room_available,
            COALESCE(ad.mtd_room_sold, 0)::int AS mtd_room_sold,
            (CASE WHEN COALESCE(ad.mtd_room_available, 0) > 0 THEN (COALESCE(ad.mtd_room_sold, 0) * 100.0 / ad.mtd_room_available) ELSE 0 END) AS mtd_occp_percent,
            (CASE WHEN COALESCE(ad.mtd_room_sold, 0) > 0 THEN (ad.mtd_room_revenue / ad.mtd_room_sold) ELSE 0 END) AS mtd_arr,
            COALESCE(ad.mtd_room_revenue, 0) AS mtd_room_revenue,
            COALESCE(ad.mtd_fnb_revenue, 0) AS mtd_fnb_revenue,
            COALESCE(ad.mtd_others_revenue, 0) AS mtd_others_revenue,
            COALESCE(ad.mtd_total_revenue, 0) AS mtd_total_revenue,
            -- YTD
            COALESCE(ad.ytd_room_available, 0)::int AS ytd_room_available,
            COALESCE(ad.ytd_room_sold, 0)::int AS ytd_room_sold,
            (CASE WHEN COALESCE(ad.ytd_room_available, 0) > 0 THEN (COALESCE(ad.ytd_room_sold, 0) * 100.0 / ad.ytd_room_available) ELSE 0 END) AS ytd_occp_percent,
            (CASE WHEN COALESCE(ad.ytd_room_sold, 0) > 0 THEN (ad.ytd_room_revenue / ad.ytd_room_sold) ELSE 0 END) AS ytd_arr,
            COALESCE(ad.ytd_room_revenue, 0) AS ytd_room_revenue,
            COALESCE(ad.ytd_fnb_revenue, 0) AS ytd_fnb_revenue,
            COALESCE(ad.ytd_others_revenue, 0) AS ytd_others_revenue,
            COALESCE(ad.ytd_total_revenue, 0) AS ytd_total_revenue
        FROM
            hotels h
        LEFT JOIN
            aggregated_data ad ON h.id = ad.hotel_id
    `;

    const queryParams = [start_date, end_date];
    let whereClauses = [];

    if (hotel_id) {
        whereClauses.push(`h.id = $${queryParams.length + 1}`);
        queryParams.push(hotel_id);
    }

    if (whereClauses.length > 0) {
        queryText += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    queryText += ` ORDER BY h.name;`;

    try {
        const { rows } = await pool.query(queryText, queryParams);
        const result = rows.map(row => ({
            hotel_id: row.hotel_id,
            hotel_name: row.hotel_name,
            period: buildPeriodObject(row, 'period'),
            mtd: buildPeriodObject(row, 'mtd'),
            ytd: buildPeriodObject(row, 'ytd'),
        }));
        res.json(result);
    } catch (error) {
        console.error('Error fetching income audit summary:', error);
        res.status(500).json({ message: 'Server error while fetching summary.' });
    }
};

/**
 * Menghapus data laporan Income Audit berdasarkan rentang tanggal dan hotel_id.
 */
exports.deleteIncomeReportsByDateRange = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, start_date, end_date } = req.query; // FIX: Read from req.query to match the route definition

    try {
        const deleteQuery = 'DELETE FROM income_audit_reports WHERE hotel_id = $1 AND report_date BETWEEN $2 AND $3';
        const result = await pool.query(deleteQuery, [hotel_id, start_date, end_date]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Tidak ada data yang ditemukan untuk dihapus pada rentang tanggal yang dipilih.' }); // FIX: Use 404 for not found
        }

        res.status(200).json({ message: `Berhasil menghapus ${result.rowCount} baris data.` });
    } catch (error) {
        console.error('Error deleting income audit reports by date range:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat menghapus data.' });
    }
};