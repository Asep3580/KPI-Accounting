-- Skema Database untuk Aplikasi KPI Accounting
-- Dibuat untuk PostgreSQL

-- Menghapus tabel jika sudah ada untuk memungkinkan pembuatan ulang yang bersih (urutan disesuaikan)
DROP TABLE IF EXISTS audit_photos, gl_closing_reports, service_charge_reports, soh_inventory_reports, ap_aging_reports, ar_aging_reports, income_audit_reports, audit_results, user_hotels, role_permissions, permissions, report_targets, agendas, audit_checklist_items, audit_types, hotels, users, roles CASCADE;

-- 1. Tabel untuk menyimpan peran pengguna (Roles)
-- Terhubung dengan menu Settings -> Kelola Role
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL -- Contoh: 'Admin', 'Staff Audit', 'Staff Hotel'
);

-- 2. Tabel untuk menyimpan data pengguna (Users)
-- Terhubung dengan menu Settings -> Kelola User
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE, -- Kolom untuk menonaktifkan user tanpa menghapusnya
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel untuk menyimpan daftar hotel
-- Terhubung dengan menu Settings -> Kelola Hotel
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- Ditambahkan UNIQUE untuk mencegah duplikasi nama
    address TEXT,
    city VARCHAR(100), -- Kolom tambahan untuk kota, sangat berguna untuk filtering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Kolom untuk melacak pembaruan
);

-- Tambahan: Tabel untuk menghubungkan user dengan hotel spesifik (Many-to-Many)
-- Berguna untuk role 'Staff Hotel' agar hanya bisa mengakses hotel tempatnya ditugaskan.
CREATE TABLE user_hotels (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, hotel_id)
);

-- 4. Tabel untuk menyimpan jenis-jenis audit
-- Terhubung dengan menu Settings -> Kelola Tipe Audit
CREATE TABLE audit_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL -- Contoh: 'Audit Rutin', 'Investigasi'
);

-- 5. Tabel untuk menyimpan item-item checklist audit
-- Terhubung dengan menu Settings -> Kelola Checklist Audit
CREATE TABLE audit_checklist_items (
    id SERIAL PRIMARY KEY,
    audit_type_id INTEGER NOT NULL REFERENCES audit_types(id) ON DELETE CASCADE, -- Jika tipe audit dihapus, checklistnya juga ikut terhapus
    category VARCHAR(255), -- Kategori checklist, misal: "Front Office", "Kamar", "F&B"
    item_text TEXT NOT NULL, -- Pertanyaan atau item checklist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel untuk menyimpan agenda visit audit
-- Terhubung dengan menu Agenda Visit Audit
CREATE TABLE agendas (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    audit_type_id INTEGER REFERENCES audit_types(id) ON DELETE SET NULL, -- Tipe audit untuk agenda ini
    start_time TIMESTAMP NOT NULL, -- Waktu mulai agenda
    end_time TIMESTAMP, -- Waktu selesai agenda (opsional)
    auditor_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Auditor yang ditugaskan
    status VARCHAR(50) DEFAULT 'Terjadwal', -- Contoh: 'Terjadwal', 'Selesai', 'Dibatalkan'
    description TEXT, -- Deskripsi atau catatan tambahan untuk agenda
    color VARCHAR(7), -- Warna event di kalender (contoh: '#3788d8')
    report_summary TEXT, -- Ringkasan hasil audit untuk 'Agenda Reports'
    report_file_path VARCHAR(255), -- Path ke file laporan yang digenerate jika ada
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan hasil dari setiap item checklist untuk sebuah agenda audit
CREATE TABLE audit_results (
    id SERIAL PRIMARY KEY,
    agenda_id INTEGER NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
    checklist_item_id INTEGER NOT NULL REFERENCES audit_checklist_items(id) ON DELETE CASCADE,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    comment TEXT, -- Catatan opsional dari auditor untuk item spesifik, diganti dari 'notes'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Pastikan setiap item checklist hanya bisa memiliki satu hasil per agenda
    UNIQUE (agenda_id, checklist_item_id)
);

-- Tabel untuk menyimpan dokumen foto sebagai bukti untuk item checklist audit
CREATE TABLE audit_photos (
    id SERIAL PRIMARY KEY,
    audit_result_id INTEGER NOT NULL REFERENCES audit_results(id) ON DELETE CASCADE,
    uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    file_path VARCHAR(255) NOT NULL, -- Path di server tempat file disimpan
    file_name VARCHAR(255) NOT NULL, -- Nama asli file
    mime_type VARCHAR(100), -- Tipe MIME file, misal: 'image/jpeg'
    file_size INTEGER, -- Ukuran file dalam bytes
    description TEXT, -- Deskripsi atau keterangan foto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel untuk menyimpan data laporan income audit harian (dari unggahan Excel)
-- FIX: Nama tabel diubah menjadi 'income_audit_reports' agar konsisten dengan kode backend.
CREATE TABLE income_audit_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Siapa yang submit
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(), -- Kapan disubmit
    report_date DATE NOT NULL,
    description TEXT, -- Kolom deskripsi, dibuat opsional (nullable)
    room_available INTEGER,
    room_ooo INTEGER,
    room_com_hu INTEGER,
    room_sold INTEGER,
    number_of_guest INTEGER,
    occp_percent NUMERIC(5, 2),
    arr NUMERIC(15, 2),
    revpar NUMERIC(15, 2),
    lodging_revenue NUMERIC(15, 2),
    others_room_revenue NUMERIC(15, 2),
    room_revenue NUMERIC(15, 2),
    breakfast_revenue NUMERIC(15, 2),
    restaurant_revenue NUMERIC(15, 2),
    room_service NUMERIC(15, 2),
    banquet_revenue NUMERIC(15, 2),
    fnb_others NUMERIC(15, 2),
    fnb_revenue NUMERIC(15, 2),
    others_revenue NUMERIC(15, 2),
    total_revenue NUMERIC(15, 2),
    service NUMERIC(15, 2),
    tax NUMERIC(15, 2),
    gross_revenue NUMERIC(15, 2),
    shared_payable NUMERIC(15, 2),
    deposit_reservation NUMERIC(15, 2),
    cash_fo NUMERIC(15, 2),
    cash_outlet NUMERIC(15, 2),
    bank_transfer NUMERIC(15, 2),
    qris NUMERIC(15, 2),
    credit_debit_card NUMERIC(15, 2),
    city_ledger NUMERIC(15, 2),
    total_settlement NUMERIC(15, 2),
    gab NUMERIC(15, 2),
    balance NUMERIC(15, 2),
    -- Mencegah duplikasi data untuk hotel dan tanggal yang sama.
    UNIQUE(hotel_id, report_date)
);

-- 8. Tabel untuk menyimpan data laporan AR Aging mingguan (dari unggahan Excel)
CREATE TABLE ar_aging_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    outstanding NUMERIC(15, 2),
    days_1_30 NUMERIC(15, 2),
    days_31_60 NUMERIC(15, 2),
    days_61_90 NUMERIC(15, 2),
    days_over_90 NUMERIC(15, 2),
    remark TEXT,
    UNIQUE(hotel_id, report_date, customer_name) -- Menjamin keunikan data per pelanggan per laporan
);

-- 9. Tabel untuk menyimpan data laporan AP Aging mingguan (dari unggahan Excel)
CREATE TABLE ap_aging_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_date DATE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    outstanding NUMERIC(15, 2),
    days_1_30 NUMERIC(15, 2),
    days_31_60 NUMERIC(15, 2),
    days_61_90 NUMERIC(15, 2),
    days_over_90 NUMERIC(15, 2),
    remark TEXT,
    UNIQUE(hotel_id, report_date, supplier_name) -- Menjamin keunikan data per supplier per laporan
);

-- 10. Tabel untuk Laporan SOH (Stock on Hand) Inventory
CREATE TABLE soh_inventory_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_date DATE NOT NULL,
    storage VARCHAR(255),
    article VARCHAR(255),
    description TEXT,
    unit VARCHAR(50),
    actual_qty NUMERIC(15, 4),
    actual_value NUMERIC(15, 2),
    act_p_price NUMERIC(15, 2),
    avrg_price NUMERIC(15, 2),
    sub_group VARCHAR(255),
    UNIQUE(hotel_id, report_date, article) -- Menjamin keunikan data per artikel per laporan
);

-- 11. Tabel untuk Laporan Service Charge
CREATE TABLE service_charge_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_date DATE NOT NULL,
    cash_fo NUMERIC(15, 2) DEFAULT 0,
    cash_fb NUMERIC(15, 2) DEFAULT 0,
    cash_short_over NUMERIC(15, 2) DEFAULT 0,
    bank_in_ar_payment NUMERIC(15, 2) DEFAULT 0,
    used_ar_deposit NUMERIC(15, 2) DEFAULT 0,
    gdrive_link TEXT,
    UNIQUE(hotel_id, report_date) -- Menjamin hanya ada satu laporan per hotel per tanggal
);

-- 12. Tabel untuk Laporan After Closing GL Monthly
CREATE TABLE gl_closing_reports (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    report_date DATE NOT NULL,
    actual_revenue NUMERIC(15, 2) NOT NULL,
    actual_expenses NUMERIC(15, 2) NOT NULL,
    actual_gop NUMERIC(15, 2) NOT NULL,
    actual_gop_ratio NUMERIC(5, 2) NOT NULL,
    budget_revenue NUMERIC(15, 2) NOT NULL,
    budget_expenses NUMERIC(15, 2) NOT NULL,
    budget_gop NUMERIC(15, 2) NOT NULL,
    budget_gop_ratio NUMERIC(5, 2) NOT NULL,
    gdrive_link TEXT,
    -- Mencegah duplikasi data untuk hotel dan tanggal yang sama
    UNIQUE(hotel_id, report_date)
);

-- Opsional: Tambahkan index untuk mempercepat pencarian data
CREATE INDEX idx_gl_closing_reports_hotel_date ON gl_closing_reports(hotel_id, report_date);

-- 13. Tabel untuk menentukan target tanggal submit laporan
-- Terhubung dengan menu Settings -> Kelola Target Laporan
CREATE TABLE report_targets (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL UNIQUE,
    target_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    day_of_week INT, -- 0 (Minggu) s/d 6 (Sabtu), untuk tipe 'weekly'
    day_of_month INT, -- 1 s/d 31, untuk tipe 'monthly'
    target_time TIME NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabel untuk hak akses (Permissions)
-- Ini adalah daftar semua kemungkinan aksi/fitur dalam aplikasi
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- Contoh: 'manage_users', 'submit_report_income'
    description TEXT
);

-- 15. Tabel penghubung antara Roles dan Permissions (Many-to-Many)
-- Menentukan role mana yang memiliki akses ke fitur apa
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- === FUNGSI TRIGGER UNTUK UPDATED_AT ===
-- Fungsi ini bisa digunakan kembali oleh tabel lain yang memiliki kolom updated_at

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan trigger ke tabel hotels
CREATE TRIGGER set_timestamp_hotels
BEFORE UPDATE ON hotels
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Terapkan trigger ke tabel audit_checklist_items
CREATE TRIGGER set_timestamp_audit_checklist_items
BEFORE UPDATE ON audit_checklist_items
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- === CONTOH DATA AWAL (SAMPLE DATA) ===

-- Isi tabel roles
INSERT INTO roles (name) VALUES ('Admin'), ('Staff Audit'), ('Staff Hotel');

-- Isi tabel users (password adalah 'password123' yang di-hash, untuk contoh saja)
INSERT INTO users (username, password_hash, full_name, email, role_id, is_active) VALUES
('admin', '$2b$10$examplehash.for.admin', 'Administrator', 'admin@example.com', 1, TRUE),
('audit_staff', '$2b$10$examplehash.for.audit', 'Staff Auditor', 'audit@example.com', 2, TRUE),
('hotel_staff', '$2b$10$examplehash.for.hotel', 'Staff Hotel B', 'hotel@example.com', 3, TRUE);

-- Isi tabel hotels
INSERT INTO hotels (name, address) VALUES
('Hotel A', 'Jl. Merdeka No. 1, Jakarta'),
('Hotel B', 'Jl. Asia Afrika No. 10, Bandung');

-- Isi tabel audit_types
INSERT INTO audit_types (name) VALUES ('Audit Rutin'), ('Investigasi'), ('Audit Khusus');

-- Isi tabel report_types
INSERT INTO report_targets (report_type, target_type, target_time) 
VALUES ('income_audit', 'daily', '09:00:00');

INSERT INTO report_targets (report_type, target_type, day_of_week, target_time) 
VALUES 
    ('ar_aging', 'weekly', 5, '15:00:00'), -- 5 = Jumat
    ('ap_aging', 'weekly', 5, '15:00:00'),
    ('soh_inventory', 'weekly', 5, '15:00:00');

INSERT INTO report_targets (report_type, target_type, day_of_month, target_time) 
VALUES 
    ('service_charge', 'monthly', 5, '17:00:00'),
    ('gl_closing', 'monthly', 19, '17:00:00');

-- Isi tabel permissions
-- Disesuaikan dengan menu di UI untuk kontrol akses yang lebih baik
INSERT INTO permissions (name, description) VALUES
('view:dashboard', 'Akses ke menu Dashboard'),
('view:agenda', 'Akses ke menu Agenda Visit Audit'),
('view:calendar', 'Akses ke menu Kalender Audit'),
('view:reports', 'Akses ke menu Laporan'),
('view_settings', 'Akses ke semua menu di halaman Settings'),
('submit:income_audit', 'Izin untuk submit laporan Income Audit Daily'),
('submit:ar_aging', 'Izin untuk submit laporan AR Aging Weekly'),
('submit:ap_aging', 'Izin untuk submit laporan AP Aging Weekly'),
('submit:soh_inventory', 'Izin untuk submit laporan SOH Inventory Weekly'),
('submit:service_charge', 'Izin untuk submit laporan Service Charge Monthly'),
('submit:gl_closing', 'Izin untuk submit laporan After Closing GL Monthly'),
('delete:reports', 'Izin untuk menghapus laporan yang sudah disubmit');

-- Isi tabel user_hotels
-- Menugaskan 'hotel_staff' (id=3) ke 'Hotel B' (id=2)
INSERT INTO user_hotels (user_id, hotel_id) VALUES (3, 2);

-- Berikan hak akses ke role
-- Admin bisa semua
INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions;

-- Staff Audit bisa semua kecuali settings
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 2, id FROM permissions WHERE name NOT LIKE 'view_settings';

-- Staff Hotel hanya bisa lihat dashboard, calendar, dan submit laporan
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 3, id FROM permissions WHERE name IN ('view:dashboard', 'view:calendar', 'submit:income_audit', 'submit:ar_aging', 'submit:ap_aging', 'submit:soh_inventory', 'submit:service_charge', 'submit:gl_closing');
