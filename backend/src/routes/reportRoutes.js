const express = require('express');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { query, validationResult } = require('express-validator');
const db = require('../config/db'); // Import the database connection pool
const incomeReportController = require('../controllers/incomeAuditReportController'); // FIX: Corrected filename

const router = express.Router();

// Helper untuk mendapatkan rentang minggu (Minggu - Sabtu)
const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Set ke hari Minggu
    startOfWeek.setHours(0, 0, 0, 0);

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

// Konfigurasi untuk memetakan tipe laporan ke tabel dan nama yang mudah dibaca
const reportTypeConfig = {
    'income_audit': { table: 'income_audit_reports', name: 'Income Audit Daily' },
    'ar_aging': { table: 'ar_aging_reports', name: 'AR Aging Weekly' },
    'ap_aging': { table: 'ap_aging_reports', name: 'AP Aging Weekly' },
    'soh_inventory': { table: 'soh_inventory_reports', name: 'SOH Inventory Weekly' },
    'service_charge': { table: 'service_charge_reports', name: 'Service Charge Monthly' },
    'gl_closing': { table: 'gl_closing_reports', name: 'After Closing GL Monthly' },
};

/**
 * GET /api/reports/submission-status
 * Mengambil status pengiriman saat ini untuk semua laporan yang memiliki target.
 * Rute ini dilindungi dan memerlukan otentikasi.
 */
router.get('/submission-status', authenticateToken, async (req, res) => {
    try {
        const { rows: targets } = await db.query('SELECT * FROM report_targets ORDER BY report_type');
        if (targets.length === 0) {
            return res.json([]);
        }

        const now = new Date();
        const statusPromises = targets.map(async (target) => {
            const config = reportTypeConfig[target.report_type];
            if (!config) {
                return { report_name: `Unknown (${target.report_type})`, status: 'Unknown', last_submission_date: null, next_deadline: null };
            }

            let periodStart, periodEnd, currentDeadline;
            let status = 'Pending'; // Status default
            let last_submission_date = null;
            let next_deadline = null;

            // 1. Tentukan periode dan deadline untuk periode SAAT INI
            switch (target.target_type) {
                case 'daily':
                    periodStart = new Date(now);
                    periodStart.setHours(0, 0, 0, 0);
                    periodEnd = new Date(now);
                    periodEnd.setHours(23, 59, 59, 999);

                    currentDeadline = new Date(now);
                    const [hour, minute] = target.target_time.split(':');
                    currentDeadline.setHours(parseInt(hour), parseInt(minute), 0, 0);
                    break;

                case 'weekly':
                    const { startOfWeek, endOfWeek } = getWeekRange(now);
                    periodStart = startOfWeek;
                    periodEnd = endOfWeek;

                    currentDeadline = new Date(startOfWeek);
                    currentDeadline.setDate(startOfWeek.getDate() + target.day_of_week);
                    const [wHour, wMinute] = target.target_time.split(':');
                    currentDeadline.setHours(parseInt(wHour), parseInt(wMinute), 0, 0);
                    break;

                case 'monthly':
                    const { startOfMonth, endOfMonth } = getMonthRange(now);
                    periodStart = startOfMonth;
                    periodEnd = endOfMonth;

                    currentDeadline = new Date(startOfMonth);
                    currentDeadline.setDate(target.day_of_month);
                    const [mHour, mMinute] = target.target_time.split(':');
                    currentDeadline.setHours(parseInt(mHour), parseInt(mMinute), 0, 0);
                    break;

                default:
                     return { report_name: config.name, status: 'Unknown Target Type', last_submission_date: null, next_deadline: null };
            }

            // 2. Cek submission dalam periode ini
            const submissionQuery = `
                SELECT MAX(submission_date) as last_submission FROM ${config.table}
                WHERE report_date >= $1 AND report_date <= $2
            `;
            const { rows: submissions } = await db.query(submissionQuery, [periodStart, periodEnd]);

            // 3. Tentukan status (Submitted, Late, Pending)
            if (submissions.length > 0 && submissions[0].last_submission) {
                status = 'Submitted';
                last_submission_date = submissions[0].last_submission;
            } else if (now > currentDeadline) {
                status = 'Late';
            }

            // 4. Tentukan deadline berikutnya
            next_deadline = new Date(currentDeadline);
            if (status === 'Late' || status === 'Submitted' || (status === 'Pending' && now > currentDeadline)) {
                // Jika sudah telat, sudah submit, atau deadline hari ini sudah lewat,
                // maka deadline berikutnya adalah untuk periode selanjutnya.
                switch (target.target_type) {
                    case 'daily':
                        next_deadline.setDate(next_deadline.getDate() + 1);
                        break;
                    case 'weekly':
                        next_deadline.setDate(next_deadline.getDate() + 7);
                        break;
                    case 'monthly':
                        // Penanganan bulan yang lebih kompleks untuk menghindari bug tanggal (misal: 31 Jan -> 28/29 Feb)
                        next_deadline = new Date(next_deadline.getFullYear(), next_deadline.getMonth() + 1, 1);
                        next_deadline.setDate(target.day_of_month);
                        const [mHour, mMinute] = target.target_time.split(':');
                        next_deadline.setHours(parseInt(mHour), parseInt(mMinute), 0, 0);
                        break;
                }
            }

            // Mengembalikan data yang lebih lengkap
            return { report_name: config.name, status, last_submission_date, next_deadline };
        });

        const results = await Promise.all(statusPromises);
        res.json(results);
    } catch (error) {
        console.error('Error fetching report submission status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;