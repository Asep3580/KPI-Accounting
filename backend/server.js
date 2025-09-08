require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes yang sudah kita buat
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/users');
const roleRoutes = require('./src/routes/roleRoutes');
const agendaRoutes = require('./src/routes/agendaRoutes');
const permissionRoutes = require('./src/routes/permissionRoutes');
const arAgingRoutes = require('./src/routes/arAgingRoutes');
const apAgingRoutes = require('./src/routes/apAgingRoutes');
const sohInventoryRoutes = require('./src/routes/sohInventoryRoutes');
const serviceChargeRoutes = require('./src/routes/serviceChargeRoutes');
const hotelRoutes = require('./src/routes/hotelRoutes');
const auditTypeRoutes = require('./src/routes/auditTypeRoutes');
const auditChecklistRoutes = require('./src/routes/auditChecklistRoutes');
const reportTargetRoutes = require('./src/routes/reportTargetRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const glClosingReportsRoutes = require('./src/routes/glClosingReports');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const incomeAuditReportRoutes = require('./src/routes/incomeAuditReportRoutes');
const photoRoutes = require('./src/routes/photoRoutes'); // Rute untuk foto
const { errorHandler, notFound } = require('./src/middleware/errorMiddleware');


const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE GLOBAL ===
// Konfigurasi CORS yang lebih aman untuk produksi
const whitelist = [
    'https://kpi-accounting.vercel.app', // Ganti dengan URL frontend Anda
    'http://127.0.0.1:5500', // Untuk development lokal
    'http://localhost:5500' // Untuk development lokal
];
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));
// Konfigurasi Helmet untuk mengizinkan pemuatan gambar lintas-asal (cross-origin)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);
app.use(express.json()); // Agar Express bisa membaca body JSON dari request

// Sajikan file statis dari folder 'uploads' agar bisa diakses dari frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === ROUTING ===
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/agendas', agendaRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/ar-aging-reports', arAgingRoutes);
app.use('/api/ap-aging-reports', apAgingRoutes);
app.use('/api/soh-inventory-reports', sohInventoryRoutes);
app.use('/api/service-charge-reports', serviceChargeRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/audit-types', auditTypeRoutes);
app.use('/api/audit-checklists', auditChecklistRoutes);
app.use('/api/report-targets', reportTargetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/gl-closing-reports', glClosingReportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/income-audit-reports', incomeAuditReportRoutes);
app.use('/api', photoRoutes); // Daftarkan rute foto

// Route dasar untuk mengetes apakah server berjalan
app.get('/', (req, res) => {
    res.send('KPI Accounting API is running...');
});

// === MIDDLEWARE PENANGANAN ERROR ===
// Middleware ini harus diletakkan setelah semua rute aplikasi.
app.use(notFound); // Menangani rute yang tidak ditemukan (404)
app.use(errorHandler); // Menangani semua error lainnya (500)

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


