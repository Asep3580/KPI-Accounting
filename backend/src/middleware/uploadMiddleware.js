const multer = require('multer');
const path = require('path');
const fs = require('fs');
const createError = require('http-errors');

// Tentukan direktori penyimpanan
const storageDir = 'uploads/audit-photos/';

// Pastikan direktori ada, jika tidak, buat direktori tersebut
fs.mkdirSync(storageDir, { recursive: true });

// Konfigurasi penyimpanan disk untuk Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, storageDir);
    },
    filename: (req, file, cb) => {
        // Buat nama file yang unik untuk menghindari konflik
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filter file untuk hanya menerima gambar
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(createError(400, 'Tipe file tidak valid. Hanya file gambar yang diizinkan.'), false);
    }
};

// Inisialisasi dan ekspor Multer dengan konfigurasi di atas
module.exports = multer({ storage, fileFilter, limits: { fileSize: 1024 * 1024 * 5 } }); // Batas 5MB