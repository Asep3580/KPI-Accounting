const path = require('path');
// Muat environment variables dari file .env di direktori root backend
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ==================================================================================
// PERBAIKAN UTAMA: Buat instance Pool baru yang terisolasi khusus untuk skrip ini.
// Ini mencegah konflik dengan connection pool yang digunakan oleh server utama.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// ==================================================================================

// Ambil argumen dari command line untuk fleksibilitas
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4];
// Username bersifat opsional, jika tidak ada, gunakan email sebagai default
const username = process.argv[5] || email;

if (!email || !password || !fullName) {
    console.error('Penggunaan: npm run create-admin -- <email> <password> "<full_name>" [username]');
    console.error('Contoh:   npm run create-admin -- admin@example.com secret123 "Admin Utama" admin_user');
    process.exit(1);
}

const createAdminUser = async () => {
    // Deklarasikan client di sini agar bisa diakses di blok finally
    let client; // Tidak perlu exitCode lagi, pool.end() akan menangani exit
    try {
        client = await pool.connect(); // Dapatkan koneksi dari pool LOKAL
        await client.query('BEGIN'); // Mulai transaksi untuk menjaga integritas data

        // 1. Dapatkan ID untuk peran 'Admin' (case-insensitive)
        const roleResult = await client.query("SELECT id FROM roles WHERE name ILIKE 'Admin'");
        if (roleResult.rows.length === 0) {
            throw new Error("Peran 'Admin' tidak ditemukan di tabel 'roles'. Pastikan peran tersebut ada.");
        }
        const adminRoleId = roleResult.rows[0].id;

        // 2. Cek apakah pengguna dengan email tersebut sudah ada
        const existingUserResult = await client.query('SELECT id, role_id FROM users WHERE email = $1', [email]);

        if (existingUserResult.rows.length > 0) {
            // Jika pengguna sudah ada, update perannya menjadi admin dan pastikan aktif
            const existingUser = existingUserResult.rows[0];
            if (existingUser.role_id !== adminRoleId) {
                await client.query("UPDATE users SET role_id = $1, is_active = TRUE WHERE id = $2", [adminRoleId, existingUser.id]);
                console.log(`✅ Pengguna "${email}" sudah ada. Peran telah diubah menjadi 'Admin' dan akun diaktifkan.`);
            } else {
                console.log(`ℹ️  Pengguna "${email}" sudah menjadi 'Admin'. Tidak ada perubahan.`);
            }
        } else {
            // Jika pengguna tidak ada, buat pengguna baru
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const insertQuery = `
                INSERT INTO users (username, password_hash, full_name, email, role_id, is_active) 
                VALUES ($1, $2, $3, $4, $5, TRUE)
                RETURNING id;
            `;
            const values = [username, passwordHash, fullName, email, adminRoleId];
            
            const newUser = await client.query(insertQuery, values);
            console.log(`✅ Pengguna admin baru "${fullName}" (${email}) berhasil dibuat dengan id: ${newUser.rows[0].id}.`);
        }

        await client.query('COMMIT'); // Commit transaksi jika semua berhasil
    } catch (err) {
        // Jika client berhasil didapat sebelum error, batalkan transaksi
        if (client) await client.query('ROLLBACK');
        console.error('❌ Gagal menjalankan skrip create-admin:', err.message);
    } finally {
        // Selalu lepaskan client jika berhasil didapat
        if (client) {
            client.release();
        }
        // PERBAIKAN: Tutup pool LOKAL ini. Ini akan secara otomatis
        // mengizinkan proses Node.js untuk berhenti (exit) dengan sendirinya.
        // Ini aman karena tidak akan mempengaruhi pool server utama.
        await pool.end();
    }
};

createAdminUser();