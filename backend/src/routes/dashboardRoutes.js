const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper untuk mendapatkan rentang minggu (Minggu - Sabtu)
const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Set ke hari Minggu
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set ke hari Sabtu
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
};

// Helper untuk mendapatkan rentang bulan
const getMonthRange = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return { startOfMonth, endOfMonth };
};

// Konfigurasi laporan dipindahkan ke level modul karena bersifat konstan.
const reportConfig = {
    'income_audit': { table: 'income_audit_reports', date_col: 'report_date', name: 'Income Audit Daily' },
    'ar_aging': { table: 'ar_aging_reports', date_col: 'report_date', name: 'AR Aging Weekly' },
    'ap_aging': { table: 'ap_aging_reports', date_col: 'report_date', name: 'AP Aging Weekly' },
    'soh_inventory': { table: 'soh_inventory_reports', date_col: 'report_date', name: 'SOH Inventory Weekly' },
    'service_charge': { table: 'service_charge_reports', date_col: 'report_date', name: 'Service Charge Monthly' },
    'gl_closing': { table: 'gl_closing_reports', date_col: 'report_date', name: 'After Closing GL Monthly' },
};

/**
 * Memproses satu target laporan untuk hotel tertentu untuk menentukan status pengirimannya.
 * Fungsi ini diekstrak untuk meningkatkan keterbacaan dan memungkinkan pengujian terpisah.
 * @param {object} hotel - Objek hotel { id, name }.
 * @param {object} target - Objek target laporan dari database.
 * @param {Date} now - Objek Date saat ini untuk konsistensi perhitungan.
 * @returns {Promise<object>} Sebuah promise yang menghasilkan objek status.
 */
async function getReportStatusForHotel(hotel, target, now) {
    const reportName = reportConfig[target.report_type]?.name || target.report_type;
    try {
        const info = reportConfig[target.report_type];
        if (!info) {
            throw new Error(`Konfigurasi untuk report_type '${target.report_type}' tidak ditemukan.`);
        }

        if (!target.target_time || !target.target_time.includes(':')) {
            throw new Error(`target_time tidak valid atau kosong untuk report_type '${target.report_type}'.`);
        }

        const [hour, minute] = target.target_time.split(':').map(Number);
        let periodStart, periodEnd, currentDeadline;

        // 1. Tentukan periode dan deadline saat ini
        switch (target.target_type) {
            case 'daily':
                periodStart = new Date(now);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(now);
                periodEnd.setHours(23, 59, 59, 999);
                currentDeadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
                break;
            case 'weekly':
                const { startOfWeek, endOfWeek } = getWeekRange(now);
                periodStart = startOfWeek;
                periodEnd = endOfWeek;
                currentDeadline = new Date(startOfWeek);
                currentDeadline.setDate(startOfWeek.getDate() + target.day_of_week);
                currentDeadline.setHours(hour, minute, 0, 0);
                break;
            case 'monthly':
                const { startOfMonth, endOfMonth } = getMonthRange(now);
                periodStart = startOfMonth;
                periodEnd = endOfMonth;
                currentDeadline = new Date(startOfMonth);
                currentDeadline.setDate(target.day_of_month);
                currentDeadline.setHours(hour, minute, 0, 0);
                break;
            default:
                throw new Error(`Tipe target '${target.target_type}' tidak valid.`);
        }

        // 2. Cek pengiriman dalam periode ini untuk hotel spesifik
        // FIX: Mengambil waktu submit (submission_date) untuk perbandingan yang lebih akurat.
        const submissionQuery = `
            SELECT MAX(submission_date) as last_submission_time
            FROM ${info.table}
            WHERE ${info.date_col} >= $1 AND ${info.date_col} <= $2 AND hotel_id = $3`;
        const { rows: submissionRows } = await pool.query(submissionQuery, [periodStart, periodEnd, hotel.id]);
        const lastSubmissionTime = submissionRows[0].last_submission_time ? new Date(submissionRows[0].last_submission_time) : null;

        // 3. Tentukan status
        // FIX: Logika status diperbarui untuk menangani kasus submit terlambat.
        let status = 'Menunggu';
        if (lastSubmissionTime) {
            // Jika ada submission, bandingkan waktu submit dengan deadline.
            status = lastSubmissionTime <= currentDeadline ? 'Tepat Waktu' : 'Terlambat';
        } else if (now > currentDeadline) { // Jika tidak ada submission dan sudah lewat deadline
            status = 'Terlambat';
        }

        // 4. Tentukan deadline berikutnya
        let nextDeadline = new Date(currentDeadline);
        if (now > currentDeadline) {
            switch (target.target_type) {
                case 'daily':
                    nextDeadline.setDate(currentDeadline.getDate() + 1);
                    break;
                case 'weekly':
                    nextDeadline.setDate(currentDeadline.getDate() + 7);
                    break;
                case 'monthly':
                    nextDeadline = new Date(currentDeadline.getFullYear(), currentDeadline.getMonth() + 1, target.day_of_month, hour, minute);
                    break;
            }
        }

        return {
            hotel_id: hotel.id,
            hotel_name: hotel.name,
            report_name: info.name,
            status: status,
            last_submission: lastSubmissionTime ? lastSubmissionTime.toISOString() : null,
            next_deadline: nextDeadline.toISOString(),
        };
    } catch (err) {
        console.error(`[Dashboard Status] Gagal memproses target untuk '${target.report_type}' di hotel '${hotel.name}':`, err.message);
        return { hotel_id: hotel.id, hotel_name: hotel.name, report_name: reportName, status: 'Processing Error', last_submission: null, next_deadline: null };
    }
}

/**
 * @route   GET /api/dashboard/status
 * @desc    Mendapatkan status pengiriman semua laporan berdasarkan targetnya
 * @access  Private
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const { hotel_id, report_type, status: status_filter } = req.query;
        const now = new Date();

        // Membuat query dinamis berdasarkan filter yang diberikan
        let hotelsQuery = 'SELECT id, name FROM hotels ORDER BY name';
        const queryParamsHotels = [];
        if (hotel_id) {
            hotelsQuery = 'SELECT id, name FROM hotels WHERE id = $1 ORDER BY name';
            queryParamsHotels.push(hotel_id);
        }

        let targetsQuery = 'SELECT * FROM report_targets ORDER BY report_type';
        const queryParamsTargets = [];
        if (report_type) {
            targetsQuery = 'SELECT * FROM report_targets WHERE report_type = $1 ORDER BY report_type';
            queryParamsTargets.push(report_type);
        }

        const [hotelsResult, targetsResult] = await Promise.all([
            pool.query(hotelsQuery, queryParamsHotels),
            pool.query(targetsQuery, queryParamsTargets)
        ]);

        const hotels = hotelsResult.rows;
        const targets = targetsResult.rows;

        if (hotels.length === 0 || targets.length === 0) {
            return res.json([]); // Tidak ada hotel atau target yang cocok dengan filter
        }

        // Menggunakan flatMap untuk membuat array promise yang datar dari perulangan bersarang.
        const allStatusPromises = hotels.flatMap(hotel =>
            targets.map(target => getReportStatusForHotel(hotel, target, now))
        );

        let reportStatuses = await Promise.all(allStatusPromises);

        // Terapkan filter status setelah semua status dihitung
        if (status_filter) {
            reportStatuses = reportStatuses.filter(report => report.status === status_filter);
        }

        res.json(reportStatuses);
    } catch (error) {
        console.error('Error saat mengambil status dashboard:', error);
        res.status(500).json({ message: 'Server error saat mengambil status laporan' });
    }
});

module.exports = router;