/**
 * ===================================================================
 * 0. GLOBAL STATE & AUTHENTICATION HELPERS
 * ===================================================================
 */

const appState = {
    currentUser: null, // Akan diisi dengan data pengguna dari token
    isRolesLoaded: false,
    isChecklistPageInitialized: false,
    isAuditTypesLoaded: false,
    isHotelsLoaded: false,
    isUsersLoaded: false,
    isAgendasTableLoaded: false,
    isCalendarInitialized: false,
    isReportsLoaded: false,
    isDashboardFiltersLoaded: false,
    isDashboardLoaded: false,
    isIncomeAuditReportLoaded: false,
    isIncomeAuditSummaryLoaded: false, // Untuk halaman summary Income Audit
    isApAgingReportLoaded: false,
    isArAgingReportViewLoaded: false,
    isApAgingReportViewLoaded: false,
    isSohInventoryReportLoaded: false,
    isGlClosingReportLoaded: false,
    isGlClosingReportViewLoaded: false,
    isReportTargetManagementLoaded: false,
    isServiceChargeReportLoaded: false, // Untuk halaman submit
    isServiceChargeReportViewLoaded: false, // Untuk halaman laporan (view)
    isReportPerformanceLoaded: false,
};

/**
 * Membaca token dari localStorage, mendekodenya, dan mengembalikan data pengguna.
 * Mengembalikan null jika token tidak ada, tidak valid, atau kedaluwarsa.
 */
function getCurrentUserFromToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        return null;
    }
    try {
        // Decode payload JWT
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const decoded = JSON.parse(decodedJson);

        // Cek apakah token sudah kedaluwarsa (exp ada dalam detik, Date.now() dalam ms)
        const isExpired = Date.now() >= decoded.exp * 1000;
        if (isExpired) {
            console.warn('Token sudah kedaluwarsa.');
            localStorage.removeItem('authToken');
            return null;
        }

        // Payload dari backend adalah objek pengguna itu sendiri
        return decoded; // Mengembalikan { id, username, role_id, role_name, ... }
    } catch (error) {
        console.error('Gagal mendekode token:', error);
        localStorage.removeItem('authToken');
        return null;
    }
}

/**
 * Mengambil nama peran (role) dari pengguna yang sedang login.
 * @returns {string|null} Nama peran (e.g., 'admin', 'auditor') atau null.
 */
const getCurrentUserRole = () => {
    if (appState.currentUser && appState.currentUser.role_name) {
        return appState.currentUser.role_name;
    }
    const user = getCurrentUserFromToken();
    return user ? user.role_name : null;
};

/**
 * Memeriksa apakah pengguna saat ini memiliki izin tertentu.
 * @param {string} permissionName - Nama izin yang akan diperiksa (e.g., 'edit:users').
 * @returns {boolean} - True jika pengguna memiliki izin, false jika tidak.
 */
function hasPermission(permissionName) {
    if (!appState.currentUser || !appState.currentUser.permissions) {
        return false;
    }
    // Admin (role_id 1) secara implisit memiliki semua izin
    if (appState.currentUser.role_id === 1) {
        return true;
    }
    // Untuk peran lain, periksa daftar izin
    return appState.currentUser.permissions.includes(permissionName);
}

document.addEventListener('DOMContentLoaded', function() {

    // Ganti URL ini dengan URL backend Anda di Render.com
    // Contoh: 'https://nama-proyek-anda.onrender.com/api'
    const API_BASE_URL = 'https://kpi-accounting-backend.onrender.com/api';

    // 1. UI Element Selectors
    const ui = {
        sidebar: document.getElementById('sidebar'),
        menuButton: document.getElementById('menu-button'),
        pageTitle: document.getElementById('page-title'),
        userMenuButton: document.getElementById('user-menu-button'),
        userMenuDropdown: document.getElementById('user-menu-dropdown'),
        changePasswordButton: document.getElementById('change-password-button'),
        changePasswordModal: document.getElementById('change-password-modal'),
        closeChangePasswordModalButton: document.getElementById('close-change-password-modal-button'), // <-- Ini yang hilang
        changePasswordForm: document.getElementById('change-password-form'),
        userNameDisplay: document.getElementById('user-name-display'),
        // Select ALL elements that can trigger navigation
        navTriggers: document.querySelectorAll('[data-target]'),
        // Agenda Modal Elements
        // Add Event Modal (from Calendar)
        addEventModal: document.getElementById('add-event-modal'),
        addEventForm: document.getElementById('add-event-form'),
        // User Management Table
        editUserModal: document.getElementById('edit-user-modal'),
        closeEditUserModalButton: document.getElementById('close-edit-user-modal'),
        editUserForm: document.getElementById('edit-user-form'),
        editUserModalTitle: document.getElementById('edit-user-modal-title'), // <-- Tambahkan ini
        addUserButton: document.getElementById('add-user-button'), // Asumsi ada tombol ini di HTML
        editUserId: document.getElementById('edit-user-id'),
        // User Management Table
        userTableBody: document.getElementById('user-table-body'),        
        // Hotel Management
        mainContent: document.querySelector('main'), // Untuk event delegation
        hotelManagementNav: document.getElementById('hotel-management-nav'),
        hotelTableBody: document.getElementById('hotel-table-body'),
        addHotelButton: document.getElementById('add-hotel-button'),
        hotelModal: document.getElementById('hotel-modal'),
        closeHotelModalButton: document.getElementById('close-hotel-modal-button'),
        hotelForm: document.getElementById('hotel-form'),
        // Audit Type Management
        auditTypeManagementNav: document.getElementById('audit-type-management-nav'),
        auditTypeTableBody: document.getElementById('audit-type-table-body'),
        addAuditTypeButton: document.getElementById('add-audit-type-button'),
        auditTypeModal: document.getElementById('audit-type-modal'),
        closeAuditTypeModalButton: document.getElementById('close-audit-type-modal-button'),
        auditTypeForm: document.getElementById('audit-type-form'),
        // Audit Checklist Management
        checklistAuditTypeSelector: document.getElementById('checklist-audit-type-selector'),
        checklistContainer: document.getElementById('checklist-container'),
        checklistHeaderTitle: document.getElementById('checklist-header-title'),
        checklistTableBody: document.getElementById('checklist-table-body'),
        addChecklistItemButton: document.getElementById('add-checklist-item-button'),
        auditChecklistModal: document.getElementById('audit-checklist-modal'),
        closeAuditChecklistModalButton: document.getElementById('close-audit-checklist-modal-button'),
        auditChecklistForm: document.getElementById('audit-checklist-form'),
        // Role Management
        roleManagementNav: document.getElementById('role-management-nav'),
        roleTableBody: document.getElementById('role-table-body'),
        addRoleButton: document.getElementById('add-role-button'),
        roleModal: document.getElementById('role-modal'),
        closeRoleModalButton: document.getElementById('close-role-modal-button'),
        roleForm: document.getElementById('role-form'),
        // Checklist View Modal
        checklistAgendaButton: document.getElementById('checklist-agenda-button'),
        checklistViewModal: document.getElementById('checklist-view-modal'),
        closeChecklistViewModalButton: document.getElementById('close-checklist-view-modal-button'),
        checklistViewContainer: document.getElementById('checklist-view-container'),
        checklistViewModalTitle: document.getElementById('checklist-view-modal-title'),        
        saveChecklistResultsButton: document.getElementById('save-checklist-results-button'),
        startAuditButton: document.getElementById('start-audit-button'),
        // Dashboard Metrics
        metricScheduled: document.getElementById('metric-scheduled'),
        metricCompleted: document.getElementById('metric-completed'),
        metricInProgress: document.getElementById('metric-in-progress'),
        finishAuditButton: document.getElementById('finish-audit-button'),
        logoutButton: null, // Akan di-set ulang di init
        // AR Aging Report
        arAgingHotelSelector: document.getElementById('ar-aging-hotel-selector'),
        arAgingDateSelector: document.getElementById('ar-aging-date-selector'),
        arAgingExcelUpload: document.getElementById('ar-aging-excel-upload'),
        arAgingExcelFileName: document.getElementById('ar-aging-excel-file-name'),
        submitArAgingButton: document.getElementById('submit-ar-aging-button'),
        arAgingTableBody: document.getElementById('ar-aging-table-body'),
        arAgingTableFoot: document.getElementById('ar-aging-table-foot'),
        // AR Aging Delete Section
        deleteArAgingHotelSelector: document.getElementById('delete-ar-aging-hotel-selector'),
        deleteArAgingDateSelector: document.getElementById('delete-ar-aging-date-selector'),
        deleteArAgingButton: document.getElementById('delete-ar-aging-button'),
        // AR Aging Report View
        reportArAgingHotelSelector: document.getElementById('report-ar-aging-hotel-selector'),
        reportArAgingStartDate: document.getElementById('report-ar-aging-start-date'),
        reportArAgingEndDate: document.getElementById('report-ar-aging-end-date'),
        reportArAgingFilterButton: document.getElementById('report-ar-aging-filter-button'),
        reportArAgingTableBody: document.getElementById('report-ar-aging-table-body'),
        reportArAgingDownloadButton: document.getElementById('report-ar-aging-download-button'),
        reportArAgingTableFoot: document.getElementById('report-ar-aging-table-foot'),
        // AP Aging Report
        // Report Performance
        hotelPerformanceChart: document.getElementById('hotel-performance-chart'),
        apAgingHotelSelector: document.getElementById('ap-aging-hotel-selector'),
        apAgingDateSelector: document.getElementById('ap-aging-date-selector'),
        apAgingExcelUpload: document.getElementById('ap-aging-excel-upload'),
        apAgingExcelFileName: document.getElementById('ap-aging-excel-file-name'),
        submitApAgingButton: document.getElementById('submit-ap-aging-button'),
        apAgingTableBody: document.getElementById('ap-aging-table-body'),
        apAgingTableFoot: document.getElementById('ap-aging-table-foot'),
        // AP Aging Delete Section
        deleteApAgingHotelSelector: document.getElementById('delete-ap-aging-hotel-selector'),
        deleteApAgingDateSelector: document.getElementById('delete-ap-aging-date-selector'),
        deleteApAgingButton: document.getElementById('delete-ap-aging-button'),
        // SOH Inventory Report
        sohHotelSelector: document.getElementById('soh-hotel-selector'),
        sohDateSelector: document.getElementById('soh-date-selector'),
        sohExcelUpload: document.getElementById('soh-excel-upload'),
        sohExcelFileName: document.getElementById('soh-excel-file-name'),
        submitSohButton: document.getElementById('submit-soh-button'),
        sohTableBody: document.getElementById('soh-table-body'),
        sohTableFoot: document.getElementById('soh-table-foot'),
        // SOH Inventory Delete Section
        deleteSohHotelSelector: document.getElementById('delete-soh-hotel-selector'),
        deleteSohDateSelector: document.getElementById('delete-soh-date-selector'),
        deleteSohButton: document.getElementById('delete-soh-button'),
        // Report Target Management
        reportTargetContainer: document.getElementById('report-target-container'),
        // SOH Inventory Report (View/Summary)
        reportSohHotelSelector: document.getElementById('report-soh-hotel-selector'),
        reportSohStartDate: document.getElementById('report-soh-start-date'),
        reportSohEndDate: document.getElementById('report-soh-end-date'),
        reportSohFilterButton: document.getElementById('report-soh-filter-button'),
        reportSohDownloadButton: document.getElementById('report-soh-download-button'),
        reportSohSummaryTableBody: document.getElementById('report-soh-summary-table-body'),
        // SOH Detail Modal
        sohDetailModal: document.getElementById('soh-detail-modal'),
        closeSohDetailModalButton: document.getElementById('close-soh-detail-modal-button'),
        sohDetailModalTitle: document.getElementById('soh-detail-modal-title'),
        sohDetailTableBody: document.getElementById('soh-detail-table-body'),
        sohDetailTableFoot: document.getElementById('soh-detail-table-foot'),
        downloadSohDetailButton: document.getElementById('download-soh-detail-button'),
        // Service Charge Report
        serviceChargeForm: document.getElementById('service-charge-form'),
        scHotelSelector: document.getElementById('sc-hotel-selector'),
        scDateSelector: document.getElementById('sc-date-selector'),
        scCashFo: document.getElementById('sc-cash-fo'),
        scCashFb: document.getElementById('sc-cash-fb'),
        scCashShortOver: document.getElementById('sc-cash-short-over'),
        scBankInAr: document.getElementById('sc-bank-in-ar'),
        scUsedArDeposit: document.getElementById('sc-used-ar-deposit'),
        scNotes: document.getElementById('sc-notes'),
        scGdriveLink: document.getElementById('sc-gdrive-link'), // New elements for calculation display
        scTotalCashCollection: document.getElementById('sc-total-cash-collection'),
        scTotalArCollection: document.getElementById('sc-total-ar-collection'),
        scTotalCollectionOverall: document.getElementById('sc-total-collection-overall'),
        // Service Charge Report View
        reportScHotelSelector: document.getElementById('report-sc-hotel-selector'),
        reportScStartDate: document.getElementById('report-sc-start-date'),
        reportScEndDate: document.getElementById('report-sc-end-date'),
        reportScFilterButton: document.getElementById('report-sc-filter-button'),
        reportScDownloadButton: document.getElementById('report-sc-download-button'),
        reportScTableBody: document.getElementById('report-sc-table-body'),
        reportScTableFoot: document.getElementById('report-sc-table-foot'),
        // Income Audit Summary Report
        reportIaHotelSelector: document.getElementById('report-ia-hotel-selector'),
        reportIaStartDate: document.getElementById('report-ia-start-date'),
        reportIaEndDate: document.getElementById('report-ia-end-date'),
        reportIaFilterButton: document.getElementById('report-ia-filter-button'),
        reportIaDownloadButton: document.getElementById('report-ia-download-button'),
        reportIaTableBody: document.getElementById('report-ia-table-body'),
        reportIaTableFoot: document.getElementById('report-ia-table-foot'),
        // Income Audit Delete Section
        deleteIncomeAuditHotelSelector: document.getElementById('delete-income-audit-hotel-selector'),
        deleteIncomeAuditStartDate: document.getElementById('delete-income-audit-start-date'),
        deleteIncomeAuditEndDate: document.getElementById('delete-income-audit-end-date'),
        deleteIncomeAuditButton: document.getElementById('delete-income-audit-button'),
    };
    // --- GL Closing Report ---
    const glClosingUi = {
        glClosingForm: document.getElementById('gl-closing-form'),
        glClosingHotelSelector: document.getElementById('gl-closing-hotel-selector'),
        glActualRevenue: document.getElementById('gl-actual-revenue'),
        glActualExpenses: document.getElementById('gl-actual-expenses'),
        glActualGop: document.getElementById('gl-actual-gop'),
        glActualGopRatio: document.getElementById('gl-actual-gop-ratio'),
        glBudgetRevenue: document.getElementById('gl-budget-revenue'),
        glBudgetExpenses: document.getElementById('gl-budget-expenses'),
        glBudgetGop: document.getElementById('gl-budget-gop'),
        glBudgetGopRatio: document.getElementById('gl-budget-gop-ratio'),
    };
    const glReportUi = {
        hotelSelector: document.getElementById('report-gl-hotel-selector'),
        startDate: document.getElementById('report-gl-start-date'),
        endDate: document.getElementById('report-gl-end-date'),
        filterButton: document.getElementById('report-gl-filter-button'),
        downloadButton: document.getElementById('report-gl-download-button'),
        tableBody: document.getElementById('report-gl-table-body'),
        tableFoot: document.getElementById('report-gl-table-foot'),
    };

    let currentIncomeAuditData = []; // Untuk menyimpan data yang akan diunduh
    let currentArAgingData = []; // Untuk menyimpan data AR Aging yang akan diunduh
    let currentApAgingData = []; // Untuk menyimpan data AP Aging yang akan diunduh
    let currentArAgingReportData = []; // Untuk menyimpan data laporan AR Aging yang sedang ditampilkan
    let currentIncomeAuditSummaryData = []; // Untuk menyimpan data summary Income Audit
    let currentGlClosingReportData = []; // Untuk menyimpan data laporan GL Closing yang sedang ditampilkan
    let auditStatusChart = null;

    let currentServiceChargeReportData = []; // Untuk menyimpan data laporan Service Charge yang sedang ditampilkan
    let currentSohInventoryData = []; // Untuk menyimpan data SOH Inventory yang akan diunduh
    let currentSohSummaryData = []; // Untuk menyimpan data ringkasan SOH yang akan diunduh
    let currentSohDetailData = []; // Untuk menyimpan data detail SOH yang akan diunduh

    // Kumpulan nama kolom yang datanya akan dirata-kanankan.
    const numericColumnsRightAlign = new Set([
        'ARR', 'RevPAR', 'Lodging Revenue', 'Others Room Revenue', 'Room Revenue', 
        'Breakfast Revenue', 'Restaurant Revenue', 'Room Service', 'Banquet Revenue', 
        'F&B Others', 'F&B Revenue', 'Others Revenue', 'Total Revenue', 'Service', 'Tax', 
        'Gross Revenue', 'Shared Payable', 'Deposit Reservation', 'Cash FO', 'Cash Outlet', 
        'Bank Transfer', 'QRIS', 'Credit/Debit Card', 'City Ledger', 'Total Settlement', 
        'GAB', 'BALANCE'
    ]);
    const arAgingNumericColumns = new Set([
        'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS'
    ]);
    const apAgingNumericColumns = new Set([
        'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS'
    ]);
    const sohNumericColumns = new Set([
        'Actual Qty', 'Actual Value', 'Act P-Price', 'Avrg Price'
    ]);

    /**
     * Menerapkan aturan visibilitas pada elemen UI berdasarkan izin pengguna.
     * Ini adalah implementasi RBAC yang benar untuk frontend.
     */
    function applyUIPermissions() {
        const isLoggedIn = !!appState.currentUser;

        // Atur visibilitas untuk elemen umum .requires-auth dan .no-auth
        document.querySelectorAll('.requires-auth').forEach(el => el.classList.toggle('hidden', !isLoggedIn));
        document.querySelectorAll('.no-auth').forEach(el => el.classList.toggle('hidden', isLoggedIn));

        // Jika tidak login, sembunyikan semua elemen dengan data-permission dan keluar
        if (!isLoggedIn) {
            document.querySelectorAll('[data-permission]').forEach(el => el.classList.add('hidden'));
            return;
        }

        // Atur visibilitas berdasarkan izin spesifik yang dimiliki pengguna
        document.querySelectorAll('[data-permission]').forEach(el => {
            const requiredPermission = el.dataset.permission;
            el.classList.toggle('hidden', !hasPermission(requiredPermission));
        });

        // Tampilkan nama pengguna di header
        if (ui.userNameDisplay) {
            ui.userNameDisplay.textContent = appState.currentUser.full_name || appState.currentUser.username;
        }
    }

    // ===================================================================
    // 2. CORE NAVIGATION & DISPLAY FUNCTIONS
    // ===================================================================

    // Hides all content sections, then shows the one with the target ID
    const showContent = (targetId) => {
        const contentSections = document.querySelectorAll('.content-section'); // Selalu ambil daftar elemen terbaru
        let sectionFound = false;
        contentSections.forEach(section => {
            if (section.id === targetId) {
                section.classList.remove('hidden');
                sectionFound = true;
            } else {
                section.classList.add('hidden');
            }
        });
        if (!sectionFound) {
            console.error(`[KESALAHAN NAVIGASI FATAL] Tidak dapat menemukan konten untuk target: '${targetId}'.`);
            console.error(`PASTIKAN ada elemen <section id="${targetId}" class="content-section"> di file HTML Anda.`);
            
            // Sebagai fallback, coba tampilkan dashboard agar halaman tidak kosong total.
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection) {
                console.log('Info: Menampilkan halaman Dashboard sebagai fallback.');
                dashboardSection.classList.remove('hidden');
            }
        }
    };

    // Updates the active state on the sidebar links
    const updateActiveSidebarLink = (targetId, clickedElement = null) => {
        // Tentukan target utama untuk highlight di sidebar.
        // Jika elemen yang diklik memiliki 'data-parent', gunakan itu. Jika tidak, gunakan targetId.
        const highlightTarget = clickedElement ? (clickedElement.dataset.parent || targetId) : targetId;
        const sidebarLinks = document.querySelectorAll('.sidebar-link'); // Selalu ambil daftar elemen terbaru

        sidebarLinks.forEach(link => {
            if (link.dataset.target === highlightTarget) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    };

    // Updates the main page title in the header
    const updatePageTitle = (targetId, clickedElement = null) => {
        let title = null;
        let sourceElement = clickedElement;

        if (!sourceElement) {
            // Jika tidak ada elemen yang diklik, coba cari dari link sidebar sebagai sumber utama
            sourceElement = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
        }

        if (sourceElement) {
            // Cari judul dari <h3> (untuk kartu) atau <span> (untuk sidebar)
            const titleElement = sourceElement.querySelector('h3') || sourceElement.querySelector('span.ml-3');
            if (titleElement) {
                title = titleElement.textContent.trim();
            }
        }

        // Jika judul masih belum ditemukan (misalnya dari tombol "Kembali"), cari dari link sidebar utama
        if (!title) {
            const mainSidebarLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
            if (mainSidebarLink) {
                const mainTitleElement = mainSidebarLink.querySelector('span.ml-3');
                if (mainTitleElement) {
                    title = mainTitleElement.textContent.trim();
                }
            }
        }

        if (ui.pageTitle) {
            // Fallback jika judul tetap tidak ditemukan
            ui.pageTitle.textContent = title || 'Dashboard';
        }
    };

    /**
     * Fungsi pembantu untuk melakukan pemanggilan API dengan penanganan token dan error standar.
     * @param {string} url URL endpoint API.
     * @param {object} options Opsi tambahan untuk fetch (method, body, dll.).
     * @returns {Promise<any>} Hasil JSON dari API.
     */
    async function apiFetch(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            throw new Error('Sesi tidak valid. Silakan login kembali.');
        }

        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = 'login.html';
                    throw new Error('Akses ditolak atau sesi berakhir.');
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Terjadi kesalahan: ${response.status}`);
            }

            // Handle respons tanpa konten seperti pada method DELETE
            if (response.status === 204) {
                return null;
            }

            return response.json();
        } catch (error) {
            // Menangkap error jaringan seperti 'TypeError: Failed to fetch'
            // dan memberikan pesan yang lebih deskriptif.
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                throw new Error('Gagal terhubung ke server. Pastikan backend berjalan.');
            }
            // Melempar kembali error lain yang tidak terduga.
            throw error;
        }
    }

    /**
     * Fungsi khusus untuk mengunggah file (FormData).
     * @param {string} url URL endpoint API.
     * @param {FormData} formData Objek FormData yang berisi file.
     * @param {object} options Opsi tambahan untuk fetch.
     * @returns {Promise<any>} Hasil JSON dari API.
     */
    async function apiUpload(url, formData, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'login.html';
            throw new Error('Sesi tidak valid. Silakan login kembali.');
        }

        const config = {
            method: 'POST',
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                // PENTING: Jangan set 'Content-Type'. Browser akan menanganinya secara otomatis untuk FormData.
                ...options.headers,
            },
            body: formData,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = 'login.html';
                    throw new Error('Akses ditolak atau sesi berakhir.');
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Terjadi kesalahan: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mengirim permintaan ke backend untuk memperbarui status sebuah agenda.
     * @param {string|number} agendaId ID dari agenda yang akan diperbarui.
     * @param {string} status Status baru ('Sedang Proses', 'Selesai', 'Dibatalkan').
     */
    async function updateAgendaStatus(agendaId, status) {
        try {
            const result = await apiFetch(`${API_BASE_URL}/agendas/${agendaId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            showToast(result.message || 'Status agenda berhasil diperbarui.', 'success');
            
            // Refresh calendar and table views to show the new status
            if (calendar) calendar.refetchEvents();
            loadAgendasTable();
            
            // Close any open modals
            if (ui.checklistViewModal && !ui.checklistViewModal.classList.contains('hidden')) {
                ui.checklistViewModal.classList.add('hidden');
            }
        } catch (error) {
            showToast(`Gagal memperbarui status: ${error.message}`, 'error');
        }
    }

    /**
     * Menampilkan notifikasi toast yang tidak mengganggu.
     * @param {string} message Pesan yang akan ditampilkan.
     * @param {'success' | 'error'} type Tipe notifikasi.
     */
    function showToast(message, type = 'success') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-5 right-5 z-[100] space-y-2';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        
        toast.className = `p-4 text-white rounded-md shadow-lg ${bgColor} animate-fade-in-right`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('animate-fade-in-right');
            toast.classList.add('animate-fade-out-right');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    /**
     * Membuat dan mengunduh laporan hasil audit dalam format PDF.
     * @param {string|number} agendaId ID dari agenda yang akan dicetak.
     */
    async function printAuditReport(agendaId) {
        // Periksa apakah library jsPDF dan html2canvas sudah dimuat
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            showToast('Library untuk membuat PDF tidak ditemukan.', 'error');
            console.error('jsPDF atau html2canvas belum dimuat. Pastikan sudah ditambahkan di file HTML.');
            return;
        }

        showToast('Mempersiapkan PDF...', 'success');

        try {
            // 1. Ambil semua data yang diperlukan secara paralel
            const [allAgendas, checklist] = await Promise.all([
                apiFetch(`${API_BASE_URL}/agendas`),
                apiFetch(`${API_BASE_URL}/agendas/${agendaId}/results`)
            ]);

            const agenda = allAgendas.find(a => a.id == agendaId);

            if (!agenda || !checklist) {
                throw new Error('Data agenda atau checklist tidak dapat ditemukan.');
            }

            // 2. Siapkan data untuk template
            const props = agenda.extendedProps || {};
            const hotelName = agenda.title.replace(/Audit.*?: /, '').trim();
            const auditorName = props.auditor_name || 'N/A';
            const auditDate = new Date(agenda.start).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const auditTime = `${new Date(agenda.start).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${agenda.end ? new Date(agenda.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}`;

            const groupedChecklist = checklist.reduce((acc, item) => {
                const category = item.category || 'Lain-lain';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {});

            // 3. Buat HTML untuk dicetak
            const printContentHtml = `
                <div id="print-container" style="font-family: Arial, sans-serif; color: #333; width: 210mm; padding: 20px; background: white;">
                    <header style="text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
                        <h1 style="font-size: 24px; margin: 0;">Laporan Hasil Audit</h1>
                        <h2 style="font-size: 20px; margin: 5px 0;">${hotelName}</h2>
                    </header>
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
                        <tr><td style="width: 120px;"><strong>Nama Auditor</strong></td><td>: ${auditorName}</td></tr>
                        <tr><td><strong>Tanggal Audit</strong></td><td>: ${auditDate}</td></tr>
                        <tr><td><strong>Waktu Audit</strong></td><td>: ${auditTime}</td></tr>
                    </table>

                    ${Object.entries(groupedChecklist).map(([category, items]) => `
                        <h3 style="font-size: 16px; background-color: #f2f2f2; padding: 8px; margin-top: 20px; border-radius: 4px;">${category}</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            ${items.map(item => `
                                <tr style="border-bottom: 1px solid #eee;"><td style="width: 20px; text-align: center; padding: 8px;"><div style="width: 16px; height: 16px; border: 1px solid #999; display: inline-block; text-align: center; line-height: 16px;">${item.is_checked ? '✔' : '&nbsp;'}</div></td><td style="padding: 8px;">${item.item_text}</td></tr>
                                ${item.comment ? `<tr><td></td><td style="padding: 0 8px 8px 8px; font-style: italic; color: #555;"><strong>Komentar:</strong> ${item.comment}</td></tr>` : ''}
                            `).join('')}
                        </table>
                    `).join('')}

                    <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 14px; page-break-inside: avoid;">
                        <table style="width: 100%; text-align: center;">
                            <tr>
                                <td style="width: 50%;"><p>Disiapkan oleh,</p><br><br><br><p style="border-top: 1px solid #000; display: inline-block; padding: 0 40px;">( ${auditorName} )</p><p>Auditor</p></td>
                                <td style="width: 50%;"><p>Mengetahui,</p><br><br><br><p style="border-top: 1px solid #000; display: inline-block; padding: 0 40px;">(_________________________)</p><p>Perwakilan Hotel</p></td>
                            </tr>
                        </table>
                    </footer>
                </div>
            `;

            // 4. Render HTML ke elemen sementara
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.innerHTML = printContentHtml;
            document.body.appendChild(tempDiv);

            // 5. Buat PDF menggunakan html2canvas dan jsPDF
            const { jsPDF } = window.jspdf;
            const canvas = await html2canvas(document.getElementById('print-container'), { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            pdf.save(`Laporan_Audit_${hotelName.replace(/ /g, '_')}_${new Date(agenda.start).toISOString().slice(0,10)}.pdf`);

            // 6. Hapus elemen sementara
            document.body.removeChild(tempDiv);
            showToast('PDF berhasil dibuat dan diunduh.', 'success');

        } catch (error) {
            console.error('Gagal membuat PDF:', error);
            showToast(`Gagal membuat PDF: ${error.message}`, 'error');
        }
    }

    // ===================================================================
    // 3. FEATURE-SPECIFIC FUNCTIONS (LOADERS, RENDERERS, ETC.)
    // ===================================================================

    // --- Checklist Management ---
    const loadChecklistManagementPage = async () => {
        if (appState.isChecklistPageInitialized) return;
        if (!ui.checklistAuditTypeSelector) return;

        try {
            const auditTypes = await apiFetch(`${API_BASE_URL}/audit-types`);
            const selector = ui.checklistAuditTypeSelector;
            selector.innerHTML = '<option value="">-- Pilih Tipe Audit --</option>'; // Reset
            auditTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                selector.appendChild(option);
            });
        } catch (error) {
            ui.checklistAuditTypeSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const loadChecklistsForType = async (auditTypeId, auditTypeName) => {
        if (!auditTypeId) {
            ui.checklistContainer.classList.add('hidden');
            return;
        }
        ui.checklistHeaderTitle.textContent = `Checklist untuk "${auditTypeName}"`;
        ui.checklistContainer.classList.remove('hidden');
        ui.checklistTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">Memuat checklist...</td></tr>`;
        try {
            const checklists = await apiFetch(`${API_BASE_URL}/audit-checklists/by-type/${auditTypeId}`);
            renderChecklistTable(checklists);
        } catch (error) {
            ui.checklistTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderChecklistTable = (checklists) => {
        ui.checklistTableBody.innerHTML = '';
        if (checklists.length === 0) {
            ui.checklistTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">Belum ada item checklist.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        checklists.forEach(item => {
            const tr = document.createElement('tr');
            // Simpan data di baris untuk diakses saat edit/hapus
            tr.dataset.id = item.id;
            tr.dataset.category = item.category || '';
            tr.dataset.itemText = item.item_text;

            // Fix: Make role check case-insensitive to ensure buttons appear for 'Admin'
            const actionButtons = hasPermission('edit:audit-checklists') // Menggunakan sistem izin yang benar
                ? `<div class="flex justify-end space-x-4">
                        <button data-id="${item.id}" class="edit-checklist-item-button text-indigo-600 hover:text-indigo-900">Edit</button>
                        <button data-id="${item.id}" class="delete-checklist-item-button text-red-600 hover:text-red-900">Hapus</button>
                   </div>`
                : '';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.category || '-'}</td>
                <td class="px-6 py-4 whitespace-pre-wrap text-sm text-gray-500">${item.item_text}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${actionButtons}</td>
            `;
            fragment.appendChild(tr);
        });
        ui.checklistTableBody.appendChild(fragment);
    };

    // --- Role Management ---
    const renderRoles = (roles) => {
        const tableBody = ui.roleTableBody;
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (roles.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-gray-500">Belum ada peran ditemukan.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        roles.forEach(role => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${role.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="manage-permissions-button text-indigo-600 hover:text-indigo-900" 
                            data-role-id="${role.id}" 
                            data-role-name="${role.name}">Kelola Hak Akses</button>
                </td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    };

    const loadRoles = async () => {
        if (appState.isRolesLoaded) return;
        if (!ui.roleTableBody) return;
        ui.roleTableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-gray-500">Memuat data...</td></tr>`;
        
        try {
            const roles = await apiFetch(`${API_BASE_URL}/roles`);
            renderRoles(roles);
            appState.isRolesLoaded = true;
        } catch (error) {
            ui.roleTableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-red-500">Error: ${error.message}</td></tr>`;
        }
    };

    // --- Audit Type Management ---
    /**
     * Merender data Tipe Audit ke dalam tabel HTML.
     * @param {Array} auditTypes - Array objek tipe audit.
     */
    function renderAuditTypes(auditTypes) {
        const tableBody = document.getElementById('audit-type-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (auditTypes.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-gray-500">Belum ada tipe audit yang ditambahkan.</td></tr>`;
            return;
        }

        // PERBAIKAN: Deklarasikan 'fragment' sebelum digunakan.
        const fragment = document.createDocumentFragment();
        const canEdit = hasPermission('edit:audit-types');
        const canDelete = hasPermission('delete:audit-types');

        auditTypes.forEach(type => {
            const tr = document.createElement('tr');
            // Simpan data di baris untuk diakses nanti
            tr.dataset.id = type.id;
            tr.dataset.name = type.name;

            const actionButtons = (canEdit || canDelete)
                ? `${canEdit ? `<button class="edit-audit-type-button text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>` : ''}
                   ${canDelete ? `<button class="delete-audit-type-button text-red-600 hover:text-red-900">Hapus</button>` : ''}`
                : '';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${type.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${actionButtons}</td>
            `;
            // Event listener sudah ditangani oleh event delegation, jadi baris di bawah ini tidak diperlukan.
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    }

    /**
     * Memuat data Tipe Audit dari API.
     */
    async function loadAuditTypes() {
        console.log('Memuat data untuk manajemen tipe audit...');
        const tableBody = document.getElementById('audit-type-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-gray-500">Memuat data...</td></tr>`;

        try {
            // Gunakan apiFetch untuk konsistensi dan penanganan error terpusat
            const auditTypes = await apiFetch(`${API_BASE_URL}/audit-types`);
            renderAuditTypes(auditTypes);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat data tipe audit:', error);
            tableBody.innerHTML = `<tr><td colspan="2" class="text-center p-4 text-red-500">Gagal memuat data.</td></tr>`;
        }
    };

    // --- User Management ---
    // Fetches and displays the list of users in the table
    const loadUsers = async () => {
        const tableBody = document.getElementById('user-table-body');
        if (!ui.userTableBody) return;
        ui.userTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-500">Memuat data pengguna...</td></tr>`;
        
        try {
            const users = await apiFetch(`${API_BASE_URL}/users`);

            ui.userTableBody.innerHTML = '';
            if (users.length === 0) {
                ui.userTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-500">Tidak ada pengguna ditemukan.</td></tr>`;
                return;
            }

            const fragment = document.createDocumentFragment();
            const canEdit = hasPermission('edit:users');
            const canDelete = hasPermission('delete:users');

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.dataset.userId = user.id;

                const actionButtons = (canEdit || canDelete)
                    ? `${canEdit ? `<button data-user-id="${user.id}" class="edit-user-button text-indigo-600 hover:text-indigo-900">Edit</button>` : ''}
                       ${canDelete ? `<button data-user-id="${user.id}" class="delete-user-button text-red-600 hover:text-red-900 ml-4">Hapus</button>` : ''}`
                    : ''; // Kosongkan jika bukan admin

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.full_name || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.role_name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.hotel_names || 'Semua'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${actionButtons}
                    </td>
                `;
                fragment.appendChild(tr);
            });
            ui.userTableBody.appendChild(fragment);
        } catch (error) {
            ui.userTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">Error: ${error.message}</td></tr>`;
        }
    };

    // --- Agenda Table View ---
    const renderAgendasTable = (agendas) => {
        const tableBody = document.getElementById('agenda-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!agendas || agendas.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">Belum ada agenda yang dijadwalkan.</td></tr>`;
            return;
        }

        // Urutkan agenda dari yang paling baru
        agendas.sort((a, b) => new Date(b.start) - new Date(a.start));

        const fragment = document.createDocumentFragment();
        agendas.forEach(agenda => {
            const tr = document.createElement('tr');
            
            const startDate = new Date(agenda.start);
            const endDate = agenda.end ? new Date(agenda.end) : null;

            const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

            let timeString = `${startDate.toLocaleDateString('id-ID', dateOptions)}, ${startDate.toLocaleTimeString('id-ID', timeOptions)}`;
            if (endDate) {
                if (endDate.toLocaleDateString() !== startDate.toLocaleDateString()) {
                    timeString += ` - ${endDate.toLocaleDateString('id-ID', dateOptions)}, ${endDate.toLocaleTimeString('id-ID', timeOptions)}`;
                } else {
                    timeString += ` - ${endDate.toLocaleTimeString('id-ID', timeOptions)}`;
                }
            }

            const hotelName = agenda.title.replace(/Audit.*?: /, '').trim();
            const auditType = agenda.title.match(/Audit (.*?):/)?.[1] || 'Umum';
            
            // PERBAIKAN: Data detail dari API berada di dalam `extendedProps` agar konsisten dengan kalender.
            const props = agenda.extendedProps || {};
            const auditorName = props.auditor_name || 'N/A';
            const status = props.status || 'N/A';

            // PERBAIKAN: Coba baca deskripsi dari properti utama dulu, lalu dari extendedProps sebagai fallback untuk mengatasi inkonsistensi API.
            const description = agenda.description || props.description || '-';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${hotelName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${auditType}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${auditorName}</td>
                <td class="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs">${description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${timeString}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style="background-color: ${agenda.color}20; color: ${agenda.color};">${status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 view-in-calendar-button">Lihat di Kalender</button>
                </td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    };

    const loadAgendasTable = async (filter = {}) => {
        const tableBody = document.getElementById('agenda-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">Memuat agenda...</td></tr>`;

        try {
            // Menggunakan endpoint '/agendas' agar mendapatkan data yang sama dengan kalender
            const agendas = await apiFetch(`${API_BASE_URL}/agendas`);
            
            let filteredAgendas = agendas;
            // Terapkan filter jika ada
            if (filter && filter.status) {
                filteredAgendas = agendas.filter(agenda => {
                    const props = agenda.extendedProps || {};
                    const status = props.status || agenda.status;
                    return status === filter.status;
                });
            }

            renderAgendasTable(filteredAgendas);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat tabel agenda:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- Audit Reports ---
    const renderAuditReportsTable = (reports) => {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!reports || reports.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Tidak ada laporan audit yang selesai.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        reports.forEach(report => {
            const tr = document.createElement('tr');
            
            const endDate = report.end ? new Date(report.end) : new Date(report.start);
            const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
            const dateString = endDate.toLocaleDateString('id-ID', dateOptions);

            const hotelName = report.title.replace(/Audit.*?: /, '').trim();
            const auditType = report.title.match(/Audit (.*?):/)?.[1] || 'Umum';
            const props = report.extendedProps || {};
            const auditorName = props.auditor_name || 'N/A';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${hotelName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${auditType}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateString}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${auditorName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="view-report-details-button text-indigo-600 hover:text-indigo-900" 
                            data-agenda-id="${report.id}" 
                            data-audit-type-id="${props.audit_type_id}" 
                            data-audit-type-name="${auditType}">Lihat Detail</button>
                </td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    };

    const loadAuditReports = async () => {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Memuat laporan...</td></tr>`;

        try {
            const allAgendas = await apiFetch(`${API_BASE_URL}/agendas`);
            const completedAudits = allAgendas.filter(agenda => ((agenda.extendedProps && agenda.extendedProps.status) || agenda.status) === 'Selesai');
            renderAuditReportsTable(completedAudits);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat laporan audit:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- AR Aging Report ---
    const loadArAgingReportPage = async () => {
        if (appState.isArAgingReportLoaded) return;

        // Fungsi ini hanya perlu memastikan dropdown hotel terisi.
        // Logika lainnya ditangani oleh setupSubmitArAgingPage.
        const selector = document.getElementById('ar-aging-hotel-selector');
        if (!selector) return;

        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;

            // Juga isi dropdown untuk bagian hapus
            const deleteSelector = ui.deleteArAgingHotelSelector;
            if (deleteSelector) {
                deleteSelector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    deleteSelector.appendChild(option);
                });
                deleteSelector.disabled = false;
            }

        } catch (error) {
            console.error('Error populating AR Aging hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderArAgingData = (data) => {
        currentArAgingData = data || [];
        if (!ui.arAgingTableBody) return;

        ui.submitArAgingButton.disabled = currentArAgingData.length === 0;

        if (!data || data.length === 0) {
            ui.arAgingTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="file-text" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data Laporan Kosong</span>
                            <span class="text-sm">File Excel mungkin kosong atau formatnya tidak sesuai.</span>
                        </div>
                    </td>
                </tr>`;
            if (typeof feather !== 'undefined') feather.replace();
            recalculateAndRenderArAgingTotals();
            return;
        }

        const headers = ['DATE', 'CUSTOMER NAME', 'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS', 'REMARK'];
        ui.arAgingTableBody.innerHTML = data.map(row => {
            return `<tr>
                ${headers.map(header => {
                    const key = Object.keys(row).find(k => k.toUpperCase().trim() === header.toUpperCase().trim());
                    let value = key ? row[key] : '';
                    const alignmentClass = arAgingNumericColumns.has(header) ? 'text-right' : 'text-left';

                    if (header === 'DATE' && value instanceof Date) {
                        value = value.toLocaleDateString('id-ID');
                    } else if (typeof value === 'number') {
                        value = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }

                    return `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 ${alignmentClass}">${value}</td>`;
                }).join('')}
            </tr>`;
        }).join('');

        recalculateAndRenderArAgingTotals();
    };

    const recalculateAndRenderArAgingTotals = () => {
        if (!ui.arAgingTableFoot) return;

        if (!currentArAgingData || currentArAgingData.length === 0) {
            ui.arAgingTableFoot.innerHTML = '';
            return;
        }

        const totals = {};
        arAgingNumericColumns.forEach(col => totals[col] = 0);

        currentArAgingData.forEach(row => {
            arAgingNumericColumns.forEach(colName => {
                const key = Object.keys(row).find(k => k.toUpperCase().trim() === colName.toUpperCase().trim());
                const value = key ? parseFloat(row[key]) : 0;
                if (!isNaN(value)) {
                    totals[colName] += value;
                }
            });
        });

        ui.arAgingTableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="2">Total</td>
                ${Array.from(arAgingNumericColumns).map(colName => `
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">
                        ${(totals[colName] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                `).join('')}
                <td class="px-4 py-3"></td>
            </tr>
        `;
    };

    const setupSubmitArAgingPage = () => {
        if (!ui.arAgingHotelSelector || !ui.arAgingDateSelector || !ui.arAgingExcelUpload) return;

        const hotelSelector = ui.arAgingHotelSelector;
        const dateSelector = ui.arAgingDateSelector;
        const fileInput = ui.arAgingExcelUpload;
        const fileInputLabel = document.querySelector('label[for="ar-aging-excel-upload"]');
        const fileNameDisplay = ui.arAgingExcelFileName;
        const submitButton = ui.submitArAgingButton;

        // --- START: Penambahan Tombol Unduh Template ---
        // Cek apakah tombol sudah ada untuk mencegah duplikasi saat navigasi
        if (!document.getElementById('download-ar-aging-template-button')) {
            const downloadTemplateButton = document.createElement('button');
            downloadTemplateButton.id = 'download-ar-aging-template-button';
            downloadTemplateButton.type = 'button'; // Penting agar tidak submit form
            downloadTemplateButton.className = 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
            downloadTemplateButton.innerHTML = `<i data-feather="download" class="w-5 h-5 mr-2"></i> Unduh Template`;

            // Sisipkan tombol sebelum tombol "Simpan"
            submitButton.parentElement.insertBefore(downloadTemplateButton, submitButton);
            if (typeof feather !== 'undefined') feather.replace();

            downloadTemplateButton.addEventListener('click', () => {
                try {
                    const headers = ['DATE', 'CUSTOMER NAME', 'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS', 'REMARK'];
                    const worksheet = XLSX.utils.json_to_sheet([], { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template AR Aging');
                    const fileName = `Template_AR_Aging_Mingguan.xlsx`;
                    XLSX.writeFile(workbook, fileName);
                } catch (error) {
                    console.error('Gagal membuat template AR Aging:', error);
                    showToast('Gagal membuat template Excel.', 'error');
                }
            });
        }
        // --- END: Penambahan Tombol Unduh Template ---

        // Awalnya nonaktifkan interaksi tanggal dan file
        dateSelector.disabled = true;
        fileInput.disabled = true;
        if (fileInputLabel) fileInputLabel.classList.add('opacity-50', 'cursor-not-allowed');

        const checkInputsAndToggleUpload = () => {
            const hotelSelected = !!hotelSelector.value;
            const dateSelected = !!dateSelector.value;
            const canUpload = hotelSelected && dateSelected;

            fileInput.disabled = !canUpload;
            if (fileInputLabel) {
                fileInputLabel.classList.toggle('opacity-50', !canUpload);
                fileInputLabel.classList.toggle('cursor-not-allowed', !canUpload);
            }
            if (!canUpload) {
                fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
            }
        };

        // Tambahkan listener ke dropdown hotel
        hotelSelector.addEventListener('change', () => {
            const hotelSelected = !!hotelSelector.value;
            dateSelector.disabled = !hotelSelected;
            if (!hotelSelected) {
                dateSelector.value = '';
                renderArAgingData([]); // Kosongkan data jika hotel di-reset
            }
            checkInputsAndToggleUpload();
        });

        // Tambahkan listener ke pemilih tanggal
        dateSelector.addEventListener('change', checkInputsAndToggleUpload);

        // Listener untuk unggah file
        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                fileNameDisplay.textContent = file.name;

                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(worksheet);
                        renderArAgingData(json);
                        showToast('File AR Aging berhasil diproses.', 'success');
                    } catch (error) {
                        showToast(`Gagal memproses file: ${error.message}`, 'error');
                        renderArAgingData([]);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });

        // Listener untuk tombol "Simpan ke Database"
        submitButton.addEventListener('click', async () => {
            const hotelId = hotelSelector.value;

            // FIX: Logic no longer depends on reportDate from UI
            if (!hotelId) {
                showToast('Silakan pilih hotel terlebih dahulu.', 'error');
                return;
            }

            if (currentArAgingData.length === 0) {
                showToast('Tidak ada data untuk dikirim. Silakan unggah file Excel.', 'error');
                return;
            }

            if (!confirm(`Anda akan mengirimkan ${currentArAgingData.length} baris data AR Aging. Lanjutkan?`)) {
                return;
            }

            try {
                const result = await apiFetch(`${API_BASE_URL}/ar-aging-reports/bulk`, {
                    method: 'POST',
                    body: JSON.stringify({
                        hotel_id: hotelId,
                        report_date: reportDate,
                        data: currentArAgingData
                    })
                });

                showToast(result.msg || 'Laporan AR Aging berhasil disimpan.', 'success');
                renderArAgingData([]); // Kosongkan tabel
                fileInput.value = ''; // Reset input file
                fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
            } catch (error) {
                showToast(`Gagal mengirim data: ${error.message}`, 'error');
            }
        });
    };

    const setupDeleteArAgingListeners = () => {
        if (!ui.deleteArAgingButton) return;

        ui.deleteArAgingButton.addEventListener('click', async () => {
            const hotelId = ui.deleteArAgingHotelSelector.value;
            const reportDate = ui.deleteArAgingDateSelector.value;

            if (!hotelId || !reportDate) {
                showToast('Silakan pilih hotel dan tanggal laporan yang akan dihapus.', 'error');
                return;
            }

            const hotelName = ui.deleteArAgingHotelSelector.options[ui.deleteArAgingHotelSelector.selectedIndex].text;
            const formattedDate = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            if (!confirm(`APAKAH ANDA YAKIN?\n\nAnda akan menghapus SEMUA data laporan AR Aging untuk:\n\nHotel: ${hotelName}\nTanggal: ${formattedDate}\n\nTindakan ini tidak dapat dibatalkan.`)) {
                return;
            }

            try {
                const params = new URLSearchParams({
                    hotel_id: hotelId,
                    report_date: reportDate
                });
                const url = `${API_BASE_URL}/ar-aging-reports?${params.toString()}`;
                
                const result = await apiFetch(url, { method: 'DELETE' });

                showToast(result.msg || 'Laporan berhasil dihapus.', 'success');
                // Reset form hapus
                ui.deleteArAgingHotelSelector.value = '';
                ui.deleteArAgingDateSelector.value = '';
            } catch (error) {
                showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
            }
        });
    };

    // --- AR Aging Report View ---
    const loadArAgingReportViewPage = async () => {
        if (appState.isArAgingReportViewLoaded) return;
        if (!ui.reportArAgingHotelSelector) return;

        ui.reportArAgingHotelSelector.innerHTML = '<option value="">Memuat hotel...</option>';
        ui.reportArAgingHotelSelector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            ui.reportArAgingHotelSelector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                ui.reportArAgingHotelSelector.appendChild(option);
            });
            ui.reportArAgingHotelSelector.disabled = false;
        } catch (error) {
            console.error('Error populating AR Aging report hotel dropdown:', error);
            ui.reportArAgingHotelSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderArAgingReportViewTotals = (data) => {
        const tableFoot = ui.reportArAgingTableFoot;
        if (!tableFoot) return;

        if (!data || data.length === 0) {
            tableFoot.innerHTML = '';
            return;
        }

        const totals = {
            outstanding: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_over_90: 0,
        };

        data.forEach(row => {
            totals.outstanding += parseFloat(row.outstanding) || 0;
            totals.days_1_30 += parseFloat(row.days_1_30) || 0;
            totals.days_31_60 += parseFloat(row.days_31_60) || 0;
            totals.days_61_90 += parseFloat(row.days_61_90) || 0;
            totals.days_over_90 += parseFloat(row.days_over_90) || 0;
        });

        const formatCurrency = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        tableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="3">Total</td>
                ${['outstanding', 'days_1_30', 'days_31_60', 'days_61_90', 'days_over_90'].map(key => `
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">${formatCurrency(totals[key])}</td>
                `).join('')}
                <td class="px-4 py-3"></td>
            </tr>
        `;
    };

    const renderArAgingReportViewTable = (data) => {
        currentArAgingReportData = data || []; // Simpan data untuk diunduh
        if (!ui.reportArAgingTableBody) return;

        // Aktifkan atau nonaktifkan tombol unduh
        if (ui.reportArAgingDownloadButton) {
            ui.reportArAgingDownloadButton.disabled = currentArAgingReportData.length === 0;
        }

        if (!data || data.length === 0) {
            ui.reportArAgingTableBody.innerHTML = `
                <tr>
                    
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="search" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan</span>
                            <span class="text-sm">Coba ubah kriteria filter Anda.</span>
                        </div>
                    </td>
                </tr>`;
            renderArAgingReportViewTotals([]); // Kosongkan total juga
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatCurrency = (num) => (parseFloat(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        ui.reportArAgingTableBody.innerHTML = data.map(row => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(row.report_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${row.customer_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.outstanding)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_1_30)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_31_60)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_61_90)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_over_90)}</td>
                <td class="px-4 py-3 whitespace-pre-wrap text-sm text-gray-500">${row.remark || '-'}</td>
            </tr>
        `).join('');

        renderArAgingReportViewTotals(data);
    };

    const setupArAgingReportViewListeners = () => {
        if (!ui.reportArAgingFilterButton) return;

        ui.reportArAgingFilterButton.addEventListener('click', async () => {
            const hotelId = ui.reportArAgingHotelSelector.value;
            const startDate = ui.reportArAgingStartDate.value;
            const endDate = ui.reportArAgingEndDate.value;

            const params = new URLSearchParams();
            if (hotelId) params.append('hotel_id', hotelId);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const url = `${API_BASE_URL}/ar-aging-reports?${params.toString()}`;
            
            try {
                const data = await apiFetch(url);
                renderArAgingReportViewTable(data);
            } catch (error) {
                showToast(`Gagal memuat laporan: ${error.message}`, 'error');
            }
        });
    };

    // --- AP Aging Report View ---
    const loadApAgingReportViewPage = async () => {
        if (appState.isApAgingReportViewLoaded) return;
        if (!ui.reportApAgingHotelSelector) return;

        ui.reportApAgingHotelSelector.innerHTML = '<option value="">Memuat hotel...</option>';
        ui.reportApAgingHotelSelector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            ui.reportApAgingHotelSelector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                ui.reportApAgingHotelSelector.appendChild(option);
            });
            ui.reportApAgingHotelSelector.disabled = false;
        } catch (error) {
            console.error('Error populating AP Aging report hotel dropdown:', error);
            ui.reportApAgingHotelSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderApAgingReportViewTotals = (data) => {
        const tableFoot = ui.reportApAgingTableFoot;
        if (!tableFoot) return;

        if (!data || data.length === 0) {
            tableFoot.innerHTML = '';
            return;
        }

        const totals = {
            outstanding: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_over_90: 0,
        };

        data.forEach(row => {
            totals.outstanding += parseFloat(row.outstanding) || 0;
            totals.days_1_30 += parseFloat(row.days_1_30) || 0;
            totals.days_31_60 += parseFloat(row.days_31_60) || 0;
            totals.days_61_90 += parseFloat(row.days_61_90) || 0;
            totals.days_over_90 += parseFloat(row.days_over_90) || 0;
        });

        const formatCurrency = (num) => (num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        tableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="3">Total</td>
                ${['outstanding', 'days_1_30', 'days_31_60', 'days_61_90', 'days_over_90'].map(key => `
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">${formatCurrency(totals[key])}</td>
                `).join('')}
                <td class="px-4 py-3"></td>
            </tr>
        `;
    };

    const renderApAgingReportViewTable = (data) => {
        currentApAgingReportData = data || []; // Simpan data untuk diunduh
        if (!ui.reportApAgingTableBody) return;

        if (ui.reportApAgingDownloadButton) {
            ui.reportApAgingDownloadButton.disabled = currentApAgingReportData.length === 0;
        }

        if (!data || data.length === 0) {
            ui.reportApAgingTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="search" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan</span>
                            <span class="text-sm">Coba ubah kriteria filter Anda.</span>
                        </div>
                    </td>
                </tr>`;
            renderApAgingReportViewTotals([]);
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatCurrency = (num) => (parseFloat(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        ui.reportApAgingTableBody.innerHTML = data.map(row => `
            <tr>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(row.report_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${row.supplier_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.outstanding)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_1_30)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_31_60)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_61_90)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.days_over_90)}</td>
                <td class="px-4 py-3 whitespace-pre-wrap text-sm text-gray-500">${row.remark || '-'}</td>
            </tr>
        `).join('');

        renderApAgingReportViewTotals(data);
    };

    const setupApAgingReportViewListeners = () => {
        if (!ui.reportApAgingFilterButton) return;

        ui.reportApAgingFilterButton.addEventListener('click', async () => {
            const hotelId = ui.reportApAgingHotelSelector.value;
            const startDate = ui.reportApAgingStartDate.value;
            const endDate = ui.reportApAgingEndDate.value;

            const params = new URLSearchParams();
            if (hotelId) params.append('hotel_id', hotelId);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const url = `${API_BASE_URL}/ap-aging-reports?${params.toString()}`;
            
            try {
                const data = await apiFetch(url);
                renderApAgingReportViewTable(data);
            } catch (error) {
                showToast(`Gagal memuat laporan: ${error.message}`, 'error');
            }
        });

        if (ui.reportApAgingDownloadButton) {
            ui.reportApAgingDownloadButton.addEventListener('click', () => {
                if (currentApAgingReportData.length === 0) {
                    showToast('Tidak ada data untuk diunduh.', 'error');
                    return;
                }
                try {
                    const worksheet = XLSX.utils.json_to_sheet(currentApAgingReportData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan AP Aging');
                    const today = new Date().toISOString().slice(0, 10);
                    const fileName = `Laporan_AP_Aging_${today}.xlsx`;
                    XLSX.writeFile(workbook, fileName);
                } catch (error) {
                    showToast('Gagal membuat file Excel.', 'error');
                }
            });
        }
    };

    // --- AP Aging Report ---
    const loadApAgingReportPage = async () => {
        if (appState.isApAgingReportLoaded) return;
        const selector = ui.apAgingHotelSelector;
        if (!selector) return;

        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;

            const deleteSelector = ui.deleteApAgingHotelSelector;
            if (deleteSelector) {
                deleteSelector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    deleteSelector.appendChild(option);
                });
                deleteSelector.disabled = false;
            }
        } catch (error) {
            console.error('Error populating AP Aging hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderApAgingData = (data) => {
        currentApAgingData = data || [];
        if (!ui.apAgingTableBody) return;
        ui.submitApAgingButton.disabled = currentApAgingData.length === 0;

        if (!data || data.length === 0) {
            ui.apAgingTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="file-text" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data Laporan Kosong</span>
                            <span class="text-sm">File Excel mungkin kosong atau formatnya tidak sesuai.</span>
                        </div>
                    </td>
                </tr>`;
            if (typeof feather !== 'undefined') feather.replace();
            recalculateAndRenderApAgingTotals();
            return;
        }

        // PERBAIKAN: Mengganti 'CUSTOMER NAME' menjadi 'SUPPLIER NAME' agar sesuai dengan konteks AP.
        const headers = ['DATE', 'SUPPLIER NAME', 'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS', 'REMARK'];
        ui.apAgingTableBody.innerHTML = data.map(row => {
            return `<tr>
                ${headers.map(header => {
                    // Mencari key secara case-insensitive
                    const key = Object.keys(row).find(k => k.toUpperCase().trim() === header.toUpperCase().trim());
                    let value = key ? row[key] : '';
                    const alignmentClass = apAgingNumericColumns.has(header) ? 'text-right' : 'text-left';

                    if (header === 'DATE' && value instanceof Date) {
                        value = value.toLocaleDateString('id-ID');
                    } else if (typeof value === 'number') {
                        value = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }

                    return `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 ${alignmentClass}">${value}</td>`;
                }).join('')}
            </tr>`;
        }).join('');

        recalculateAndRenderApAgingTotals();
    };

    const recalculateAndRenderApAgingTotals = () => {
        if (!ui.apAgingTableFoot) return;
        if (!currentApAgingData || currentApAgingData.length === 0) {
            ui.apAgingTableFoot.innerHTML = '';
            return;
        }
        const totals = {};
        apAgingNumericColumns.forEach(col => totals[col] = 0);
        currentApAgingData.forEach(row => {
            apAgingNumericColumns.forEach(colName => {
                const key = Object.keys(row).find(k => k.toUpperCase().trim() === colName.toUpperCase().trim());
                const value = key ? parseFloat(row[key]) : 0;
                if (!isNaN(value)) totals[colName] += value;
            });
        });
        ui.apAgingTableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="2">Total</td>
                ${Array.from(apAgingNumericColumns).map(colName => `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-right">${(totals[colName] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`).join('')}
                <td class="px-4 py-3"></td>
            </tr>`;
    };

    const setupSubmitApAgingPage = () => {
        if (!ui.apAgingHotelSelector) return;

        const hotelSelector = ui.apAgingHotelSelector;
        const dateSelector = ui.apAgingDateSelector;
        const fileInput = ui.apAgingExcelUpload;
        const fileInputLabel = document.querySelector('label[for="ap-aging-excel-upload"]');
        const fileNameDisplay = ui.apAgingExcelFileName;
        const submitButton = ui.submitApAgingButton;

        // --- START: Penambahan Tombol Unduh Template ---
        if (!document.getElementById('download-ap-aging-template-button')) {
            const downloadTemplateButton = document.createElement('button');
            downloadTemplateButton.id = 'download-ap-aging-template-button';
            downloadTemplateButton.type = 'button'; // Penting agar tidak submit form
            downloadTemplateButton.className = 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
            downloadTemplateButton.innerHTML = `<i data-feather="download" class="w-5 h-5 mr-2"></i> Unduh Template`;

            // Sisipkan tombol sebelum tombol "Simpan"
            submitButton.parentElement.insertBefore(downloadTemplateButton, submitButton);
            if (typeof feather !== 'undefined') feather.replace();

            downloadTemplateButton.addEventListener('click', () => {
                try {
                    // Header disesuaikan untuk AP Aging (menggunakan SUPPLIER NAME)
                    const headers = ['DATE', 'SUPPLIER NAME', 'OUTSTANDING', '1 - 30 DAYS', '31 - 60 DAYS', '61 - 90 DAYS', 'OVER 90 DAYS', 'REMARK'];
                    const worksheet = XLSX.utils.json_to_sheet([], { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template AP Aging');
                    const fileName = `Template_AP_Aging_Mingguan.xlsx`;
                    XLSX.writeFile(workbook, fileName);
                } catch (error) {
                    console.error('Gagal membuat template AP Aging:', error);
                    showToast('Gagal membuat template Excel.', 'error');
                }
            });
        }
        // --- END: Penambahan Tombol Unduh Template ---
 
        // Nonaktifkan semua kontrol interaktif pada awalnya
        dateSelector.disabled = true;
        fileInput.disabled = true;
        if (fileInputLabel) fileInputLabel.classList.add('opacity-50', 'cursor-not-allowed');
        submitButton.disabled = true;

        const checkInputsAndToggleUpload = () => {
            const hotelSelected = !!hotelSelector.value;
            const dateSelected = !!dateSelector.value;
            const canUpload = hotelSelected && dateSelected;

            fileInput.disabled = !canUpload;
            if (fileInputLabel) {
                fileInputLabel.classList.toggle('opacity-50', !canUpload);
                fileInputLabel.classList.toggle('cursor-not-allowed', !canUpload);
            }
            if (!canUpload) {
                fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
            }
        };

        hotelSelector.addEventListener('change', () => {
            const hotelSelected = !!hotelSelector.value;
            dateSelector.disabled = !hotelSelected;
            if (!hotelSelected) {
                dateSelector.value = '';
                renderApAgingData([]); // Kosongkan data jika hotel di-reset
            }
            checkInputsAndToggleUpload();
        });

        dateSelector.addEventListener('change', checkInputsAndToggleUpload);

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                fileNameDisplay.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(worksheet);
                        renderApAgingData(json);
                        showToast('File AP Aging berhasil diproses.', 'success');
                    } catch (error) {
                        showToast(`Gagal memproses file: ${error.message}`, 'error');
                        renderApAgingData([]);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });

        submitButton.addEventListener('click', async () => {
            if (!hotelSelector.value || !dateSelector.value) return showToast('Silakan pilih hotel dan tanggal laporan terlebih dahulu.', 'error');
            if (currentApAgingData.length === 0) return showToast('Tidak ada data untuk dikirim. Silakan unggah file Excel.', 'error');
            if (!confirm(`Anda akan mengirimkan ${currentApAgingData.length} baris data AP Aging. Lanjutkan?`)) return;

            // Pemetaan dari header Excel (case-insensitive) ke kunci yang diharapkan backend.
            const keyMapping = {
                'SUPPLIER NAME': 'supplier_name',
                'OUTSTANDING': 'outstanding',
                '1 - 30 DAYS': 'days_1_30',
                '31 - 60 DAYS': 'days_31_60',
                '61 - 90 DAYS': 'days_61_90',
                'OVER 90 DAYS': 'days_over_90',
                'REMARK': 'remark'
            };

            // Transformasi data agar sesuai dengan format yang diharapkan backend.
            const dataToSubmit = currentApAgingData.map(row => {
                const newRow = {};
                for (const excelHeader in keyMapping) {
                    const backendKey = keyMapping[excelHeader];
                    const originalKey = Object.keys(row).find(k => k.toUpperCase().trim() === excelHeader.toUpperCase().trim());
                    if (originalKey !== undefined) {
                        newRow[backendKey] = row[originalKey];
                    }
                }
                return newRow;
            });

            try {
                const result = await apiFetch(`${API_BASE_URL}/ap-aging-reports/bulk`, {
                    method: 'POST',
                    body: JSON.stringify({
                        hotel_id: hotelSelector.value,
                        report_date: dateSelector.value,
                        data: dataToSubmit // Gunakan data yang sudah ditransformasi
                    })
                });
                showToast(result.msg || 'Laporan AP Aging berhasil disimpan.', 'success');
                renderApAgingData([]);
                fileInput.value = '';
                fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
            } catch (error) {
                showToast(`Gagal mengirim data: ${error.message}`, 'error');
            }
        });
    };

    // --- SOH Inventory Report ---
    const loadSohInventoryReportPage = async () => {
        if (appState.isSohInventoryReportLoaded) return;
        const selector = ui.sohHotelSelector;
        if (!selector) return;

        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;

            const deleteSelector = ui.deleteSohHotelSelector;
            if (deleteSelector) {
                deleteSelector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    deleteSelector.appendChild(option);
                });
                deleteSelector.disabled = false;
            }
        } catch (error) {
            console.error('Error populating SOH Inventory hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderSohInventoryData = (data) => {
        currentSohInventoryData = data || [];
        if (!ui.sohTableBody) return;
        ui.submitSohButton.disabled = currentSohInventoryData.length === 0;

        if (!data || data.length === 0) {
            ui.sohTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="file-text" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data Laporan Kosong</span>
                            <span class="text-sm">File Excel mungkin kosong atau formatnya tidak sesuai.</span>
                        </div>
                    </td>
                </tr>`;
            if (typeof feather !== 'undefined') feather.replace();
            // recalculateAndRenderSohTotals(); // Jika ada total
            return;
        }

        const headers = ['Date', 'Storage', 'Article', 'Description', 'Unit', 'Actual Qty', 'Actual Value', 'Act P-Price', 'Avrg Price', 'Sub Group'];
        ui.sohTableBody.innerHTML = data.map(row => {
            return `<tr>
                ${headers.map(header => {
                    const key = Object.keys(row).find(k => k.toUpperCase().trim() === header.toUpperCase().trim());
                    let value = key ? row[key] : '';
                    const alignmentClass = sohNumericColumns.has(header) ? 'text-right' : 'text-left';

                    if (header.toLowerCase() === 'date' && value instanceof Date) {
                        value = value.toLocaleDateString('id-ID');
                    } else if (typeof value === 'number') {
                        value = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }

                    return `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 ${alignmentClass}">${value}</td>`;
                }).join('')}
            </tr>`;
        }).join('');
        // recalculateAndRenderSohTotals(); // Jika ada total
    };

    const setupSubmitSohInventoryPage = () => {
        if (!ui.sohHotelSelector) return;

        const hotelSelector = ui.sohHotelSelector;
        const dateSelector = ui.sohDateSelector;
        const fileInput = ui.sohExcelUpload;
        const fileInputLabel = document.querySelector('label[for="soh-excel-upload"]');
        const fileNameDisplay = ui.sohExcelFileName;
        const submitButton = ui.submitSohButton;

        // --- START: Penambahan Tombol Unduh Template ---
        if (!document.getElementById('download-soh-template-button')) {
            const downloadTemplateButton = document.createElement('button');
            downloadTemplateButton.id = 'download-soh-template-button';
            downloadTemplateButton.type = 'button';
            downloadTemplateButton.className = 'inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
            downloadTemplateButton.innerHTML = `<i data-feather="download" class="w-5 h-5 mr-2"></i> Unduh Template`;

            submitButton.parentElement.insertBefore(downloadTemplateButton, submitButton);
            if (typeof feather !== 'undefined') feather.replace();

            downloadTemplateButton.addEventListener('click', () => {
                try {
                    const headers = ['Date', 'Storage', 'Article', 'Description', 'Unit', 'Actual Qty', 'Actual Value', 'Act P-Price', 'Avrg Price', 'Sub Group'];
                    const worksheet = XLSX.utils.json_to_sheet([], { header: headers });
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template SOH');
                    const fileName = `Template_SOH_Inventory.xlsx`;
                    XLSX.writeFile(workbook, fileName);
                } catch (error) {
                    console.error('Gagal membuat template SOH:', error);
                    showToast('Gagal membuat template Excel.', 'error');
                }
            });
        }
        // --- END: Penambahan Tombol Unduh Template ---

        dateSelector.disabled = true;
        fileInput.disabled = true;
        if (fileInputLabel) fileInputLabel.classList.add('opacity-50', 'cursor-not-allowed');
        submitButton.disabled = true;

        const checkInputsAndToggleUpload = () => {
            const canUpload = !!hotelSelector.value && !!dateSelector.value;
            fileInput.disabled = !canUpload;
            if (fileInputLabel) {
                fileInputLabel.classList.toggle('opacity-50', !canUpload);
                fileInputLabel.classList.toggle('cursor-not-allowed', !canUpload);
            }
            if (!canUpload) fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
        };

        hotelSelector.addEventListener('change', () => {
            dateSelector.disabled = !hotelSelector.value;
            if (!hotelSelector.value) {
                dateSelector.value = '';
                renderSohInventoryData([]);
            }
            checkInputsAndToggleUpload();
        });

        dateSelector.addEventListener('change', checkInputsAndToggleUpload);

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                fileNameDisplay.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        renderSohInventoryData(json);
                        showToast('File SOH Inventory berhasil diproses.', 'success');
                    } catch (error) {
                        showToast(`Gagal memproses file: ${error.message}`, 'error');
                        renderSohInventoryData([]);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });

        submitButton.addEventListener('click', async () => {
            if (!hotelSelector.value || !dateSelector.value) return showToast('Pilih hotel dan tanggal laporan.', 'error');
            if (currentSohInventoryData.length === 0) return showToast('Tidak ada data untuk dikirim.', 'error');
            if (!confirm(`Anda akan mengirimkan ${currentSohInventoryData.length} baris data SOH Inventory. Lanjutkan?`)) return;

            try {
                const result = await apiFetch(`${API_BASE_URL}/soh-inventory-reports/bulk`, {
                    method: 'POST',
                    body: JSON.stringify({
                        hotel_id: hotelSelector.value,
                        report_date: dateSelector.value,
                        data: currentSohInventoryData
                    })
                });
                showToast(result.msg || 'Laporan SOH Inventory berhasil disimpan.', 'success');
                renderSohInventoryData([]);
                fileInput.value = '';
                fileNameDisplay.textContent = 'Pilih hotel dan tanggal terlebih dahulu';
            } catch (error) {
                showToast(`Gagal mengirim data: ${error.message}`, 'error');
            }
        });
    };

    // --- Service Charge Report ---
    const loadServiceChargeReportPage = async () => {
        if (appState.isServiceChargeReportLoaded) return;
        const selector = ui.scHotelSelector;
        if (!selector) return;

        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;
            appState.isServiceChargeReportLoaded = true; // Tandai sudah dimuat
        } catch (error) {
            console.error('Error populating Service Charge hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const setupServiceChargeCalculations = () => {
        const cashInputs = [ui.scCashFo, ui.scCashFb, ui.scCashShortOver];
        const arInputs = [ui.scBankInAr, ui.scUsedArDeposit];

        const calculateTotals = () => {
            let totalCash = 0;
            cashInputs.forEach(input => {
                totalCash += parseFloat(input.value) || 0;
            });
            ui.scTotalCashCollection.textContent = totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            let totalAr = 0;
            arInputs.forEach(input => {
                totalAr += parseFloat(input.value) || 0;
            });
            ui.scTotalArCollection.textContent = totalAr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const overallTotal = totalCash + totalAr;
            ui.scTotalCollectionOverall.textContent = overallTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Add event listeners to all relevant input fields
        cashInputs.forEach(input => {
            if (input) input.addEventListener('input', calculateTotals);
        });
        arInputs.forEach(input => {
            if (input) input.addEventListener('input', calculateTotals);
        });

        // Initial calculation when the page loads (or form is reset)
        if (ui.serviceChargeForm) {
            ui.serviceChargeForm.addEventListener('reset', calculateTotals);
        }
        calculateTotals(); // Call once on initial setup
    };

    const setupSubmitServiceChargeListeners = () => {
        if (!ui.serviceChargeForm) return;

        ui.serviceChargeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(ui.serviceChargeForm);
            const data = Object.fromEntries(formData.entries());

            if (!data.hotel_id || !data.report_date) {
                return showToast('Hotel dan Tanggal Laporan harus diisi.', 'error');
            }

            try {
                const result = await apiFetch(`${API_BASE_URL}/service-charge-reports`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast(result.msg || 'Laporan Service Charge berhasil disimpan.', 'success');
                ui.serviceChargeForm.reset(); // Reset form setelah berhasil
                setupServiceChargeCalculations(); // Panggil ulang untuk mereset total
            } catch (error) {
                let errorMessage = 'Gagal menyimpan data.';
                if (error.data && error.data.errors && error.data.errors.length > 0) {
                    errorMessage = error.data.errors.map(err => err.msg).join(' ');
                }
                showToast(errorMessage, 'error');
            }
        });
    };

    // --- Service Charge Report View ---
    const loadServiceChargeReportViewPage = async () => {
        if (appState.isServiceChargeReportViewLoaded) return;
        const selector = ui.reportScHotelSelector;
        if (!selector) return;

        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;
            appState.isServiceChargeReportViewLoaded = true;
        } catch (error) {
            console.error('Error populating Service Charge report hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderServiceChargeReportTotals = (data) => {
        const tableFoot = ui.reportScTableFoot;
        if (!tableFoot) return;

        if (!data || data.length === 0) {
            tableFoot.innerHTML = '';
            return;
        }

        const totals = {
            total_cash_collection: 0,
            total_ar_collection: 0,
            total_collection: 0,
        };

        data.forEach(row => {
            totals.total_cash_collection += parseFloat(row.total_cash_collection) || 0;
            totals.total_ar_collection += parseFloat(row.total_ar_collection) || 0;
            totals.total_collection += parseFloat(row.total_collection) || 0;
        });

        const formatCurrency = (num) => (num || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        tableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="2">Total</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800">${formatCurrency(totals.total_cash_collection)}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800">${formatCurrency(totals.total_ar_collection)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">${formatCurrency(totals.total_collection)}</td>
                <td class="px-4 py-3" colspan="2"></td>
            </tr>
        `;
    };

    const renderServiceChargeReportTable = (data) => {
        currentServiceChargeReportData = data || [];
        const tableBody = ui.reportScTableBody;
        const downloadButton = ui.reportScDownloadButton;

        if (!tableBody) return;

        if (downloadButton) {
            downloadButton.disabled = currentServiceChargeReportData.length === 0;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="search" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan.</span>
                            <span class="text-sm">Silakan gunakan filter untuk menampilkan data.</span>
                        </div>
                    </td>
                </tr>`;
            renderServiceChargeReportTotals([]);
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatCurrency = (num) => (parseFloat(num) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        tableBody.innerHTML = data.map(row => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(row.report_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.total_cash_collection)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.total_ar_collection)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatCurrency(row.total_collection)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                    ${row.gdrive_link ? `<a href="${row.gdrive_link}" target="_blank" class="text-indigo-600 hover:text-indigo-900 inline-flex items-center"><i data-feather="external-link" class="w-4 h-4"></i></a>` : '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <button data-id="${row.id}" class="delete-sc-report-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors duration-200">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        renderServiceChargeReportTotals(data);
        if (typeof feather !== 'undefined') feather.replace();
    };

    // --- Income Audit Summary Report ---
    const renderIncomeAuditSummaryTotals = (data) => {
        const tableFoot = ui.reportIaTableFoot;
        if (!tableFoot) return;

        if (!data || data.length === 0) {
            tableFoot.innerHTML = '';
            return;
        }

        const grandTotals = {
            period: { room_available: 0, room_sold: 0, room_revenue: 0, fnb_revenue: 0, others_revenue: 0, total_revenue: 0 },
            mtd: { room_available: 0, room_sold: 0, room_revenue: 0, fnb_revenue: 0, other_revenue: 0, total_revenue: 0 },
            ytd: { room_available: 0, room_sold: 0, room_revenue: 0, fnb_revenue: 0, other_revenue: 0, total_revenue: 0 },
        };

        data.forEach(hotelData => {
            for (const period of ['period', 'mtd', 'ytd']) {
                for (const key in grandTotals[period]) {
                    grandTotals[period][key] += parseFloat(hotelData[period]?.[key] || 0);
                }
            }
        });

        const calculateMetrics = (periodData) => {
            const occp = periodData.room_available > 0 ? (periodData.room_sold / periodData.room_available) * 100 : 0;
            const arr = periodData.room_sold > 0 ? periodData.room_revenue / periodData.room_sold : 0;
            return { occp, arr };
        };

        const metrics = {
            period: calculateMetrics(grandTotals.period),
            mtd: calculateMetrics(grandTotals.mtd),
            ytd: calculateMetrics(grandTotals.ytd),
        };

        const formatInt = (num) => (num || 0).toLocaleString('id-ID');
        const formatCurrency = (num) => (num || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const formatPercent = (num) => `${(num || 0).toFixed(2)}%`;

        const renderPeriodTotals = (period) => `
            <td class="px-2 py-3 text-right">${formatInt(grandTotals[period].room_available)}</td>
            <td class="px-2 py-3 text-right">${formatInt(grandTotals[period].room_sold)}</td>
            <td class="px-2 py-3 text-right">${formatPercent(metrics[period].occp)}</td>
            <td class="px-2 py-3 text-right">${formatCurrency(metrics[period].arr)}</td>
            <td class="px-2 py-3 text-right">${formatCurrency(grandTotals[period].room_revenue)}</td>
            <td class="px-2 py-3 text-right">${formatCurrency(grandTotals[period].fnb_revenue)}</td>
            <td class="px-2 py-3 text-right">${formatCurrency(grandTotals[period].other_revenue)}</td>
            <td class="px-2 py-3 text-right border-r">${formatCurrency(grandTotals[period].total_revenue)}</td>
        `;

        tableFoot.innerHTML = `
            <tr>
                <td class="sticky left-0 bg-gray-100 z-10 px-3 py-3 text-left font-bold text-gray-800 border-r">Grand Total</td>
                ${renderPeriodTotals('period')}
                ${renderPeriodTotals('mtd')}
                ${renderPeriodTotals('ytd')}
            </tr>
        `;
    };

    const renderIncomeAuditSummaryTable = (data) => {
        currentIncomeAuditSummaryData = data || [];
        const tableBody = ui.reportIaTableBody;
        const downloadButton = ui.reportIaDownloadButton;

        if (!tableBody) return;
        if (downloadButton) downloadButton.disabled = currentIncomeAuditSummaryData.length === 0;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="25" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="inbox" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan untuk tanggal yang dipilih.</span>
                        </div>
                    </td>
                </tr>`;
            renderIncomeAuditSummaryTotals([]);
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatInt = (num) => (num || 0).toLocaleString('id-ID');
        const formatCurrency = (num) => (num || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const formatPercent = (num) => `${(num || 0).toFixed(2)}%`;

        const renderPeriodCells = (periodData) => {
            const p = periodData || {}; // Fallback to empty object if period data is null
            return `
                <td class="px-2 py-3 text-right">${formatInt(p.room_available)}</td>
                <td class="px-2 py-3 text-right">${formatInt(p.room_sold)}</td>
                <td class="px-2 py-3 text-right">${formatPercent(p.occp_percent)}</td>
                <td class="px-2 py-3 text-right">${formatCurrency(p.arr)}</td>
                <td class="px-2 py-3 text-right">${formatCurrency(p.room_revenue)}</td>
                <td class="px-2 py-3 text-right">${formatCurrency(p.fnb_revenue)}</td>
                <td class="px-2 py-3 text-right">${formatCurrency(p.others_revenue)}</td>
                <td class="px-2 py-3 text-right border-r font-medium text-gray-800">${formatCurrency(p.total_revenue)}</td>
            `;
        };

        tableBody.innerHTML = data.map(row => `
            <tr class="hover:bg-gray-50 group">
                <td class="sticky left-0 bg-white group-hover:bg-gray-50 z-10 px-3 py-3 text-left font-semibold text-gray-900 border-r">${row.hotel_name}</td>
                ${renderPeriodCells(row.period)}
                ${renderPeriodCells(row.mtd)}
                ${renderPeriodCells(row.ytd)}
            </tr>
        `).join('');

        renderIncomeAuditSummaryTotals(data);
    };

    const loadIncomeAuditSummaryPage = async () => {
        if (appState.isIncomeAuditSummaryLoaded) return;

        // Populate hotel dropdown
        const selector = ui.reportIaHotelSelector;
        if (selector) {
            selector.innerHTML = '<option value="">Memuat hotel...</option>';
            selector.disabled = true;
            try {
                const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
                selector.innerHTML = '<option value="">Semua Hotel</option>';
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    selector.appendChild(option);
                });
                selector.disabled = false;
            } catch (error) {
                selector.innerHTML = `<option value="">${error.message}</option>`;
            }
        }

        // Set default date range to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (ui.reportIaStartDate) ui.reportIaStartDate.value = yesterdayStr;
        if (ui.reportIaEndDate) ui.reportIaEndDate.value = yesterdayStr;

        appState.isIncomeAuditSummaryLoaded = true;
    };

    const setupDeleteSohInventoryListeners = () => {
        if (!ui.deleteSohButton) return;
        ui.deleteSohButton.addEventListener('click', async () => {
            const hotelId = ui.deleteSohHotelSelector.value;
            const reportDate = ui.deleteSohDateSelector.value;
            if (!hotelId || !reportDate) return showToast('Pilih hotel dan tanggal laporan yang akan dihapus.', 'error');

            const hotelName = ui.deleteSohHotelSelector.options[ui.deleteSohHotelSelector.selectedIndex].text;
            const formattedDate = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!confirm(`YAKIN?\n\nAnda akan menghapus SEMUA laporan SOH Inventory untuk:\nHotel: ${hotelName}\nTanggal: ${formattedDate}\n\nTindakan ini tidak dapat dibatalkan.`)) return;

            try {
                const params = new URLSearchParams({ hotel_id: hotelId, report_date: reportDate });
                const result = await apiFetch(`${API_BASE_URL}/soh-inventory-reports?${params.toString()}`, { method: 'DELETE' });
                showToast(result.msg || 'Laporan berhasil dihapus.', 'success');
                ui.deleteSohHotelSelector.value = '';
                ui.deleteSohDateSelector.value = '';
            } catch (error) {
                showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
            }
        });
    };

    // --- GL Closing Report ---
    const loadGlClosingPage = async () => {
        if (appState.isGlClosingReportLoaded || !glClosingUi.glClosingHotelSelector) return;

        const selector = glClosingUi.glClosingHotelSelector;
        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;
            appState.isGlClosingReportLoaded = true; // Tandai sudah dimuat
        } catch (error) {
            console.error('Error populating GL Closing hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const setupGlClosingForm = () => {
        if (!glClosingUi.glClosingForm) return;

        const formatCurrency = (num) => `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatRatio = (num) => `${num.toFixed(2)} %`;

        const calculateGlValues = () => {
            // Actual Calculation
            const actualRevenue = parseFloat(glClosingUi.glActualRevenue.value) || 0;
            const actualExpenses = parseFloat(glClosingUi.glActualExpenses.value) || 0;
            const actualGop = actualRevenue - actualExpenses;
            const actualGopRatio = actualRevenue !== 0 ? (actualGop / actualRevenue) * 100 : 0;

            glClosingUi.glActualGop.textContent = formatCurrency(actualGop);
            glClosingUi.glActualGopRatio.textContent = formatRatio(actualGopRatio);
            glClosingUi.glActualGop.classList.toggle('text-red-600', actualGop < 0);
            glClosingUi.glActualGopRatio.classList.toggle('text-red-600', actualGop < 0);

            // Budget Calculation
            const budgetRevenue = parseFloat(glClosingUi.glBudgetRevenue.value) || 0;
            const budgetExpenses = parseFloat(glClosingUi.glBudgetExpenses.value) || 0;
            const budgetGop = budgetRevenue - budgetExpenses;
            const budgetGopRatio = budgetRevenue !== 0 ? (budgetGop / budgetRevenue) * 100 : 0;

            glClosingUi.glBudgetGop.textContent = formatCurrency(budgetGop);
            glClosingUi.glBudgetGopRatio.textContent = formatRatio(budgetGopRatio);
            glClosingUi.glBudgetGop.classList.toggle('text-red-600', budgetGop < 0);
            glClosingUi.glBudgetGopRatio.classList.toggle('text-red-600', budgetGop < 0);
        };

        // Add event listeners to all input fields
        const inputs = [glClosingUi.glActualRevenue, glClosingUi.glActualExpenses, glClosingUi.glBudgetRevenue, glClosingUi.glBudgetExpenses];
        inputs.forEach(input => input?.addEventListener('input', calculateGlValues));

        // Handle form submission
        glClosingUi.glClosingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(glClosingUi.glClosingForm);
            const data = Object.fromEntries(formData.entries());

            if (!data.hotel_id || !data.report_date) return showToast('Hotel dan Tanggal Laporan harus diisi.', 'error');

            try {
                const result = await apiFetch(`${API_BASE_URL}/gl-closing-reports`, { method: 'POST', body: JSON.stringify(data) });
                showToast(result.msg || 'Laporan GL Closing berhasil disimpan.', 'success');
                glClosingUi.glClosingForm.reset();
                calculateGlValues(); // Reset display values to 0
            } catch (error) {
                showToast(`Gagal menyimpan data: ${error.message}`, 'error');
            }
        });
    };

    // --- GL Closing Report View ---
    const loadGlClosingReportViewPage = async () => {
        if (appState.isGlClosingReportViewLoaded || !glReportUi.hotelSelector) return;

        glReportUi.hotelSelector.innerHTML = '<option value="">Memuat hotel...</option>';
        glReportUi.hotelSelector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            glReportUi.hotelSelector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                glReportUi.hotelSelector.appendChild(option);
            });
            glReportUi.hotelSelector.disabled = false;
            appState.isGlClosingReportViewLoaded = true;
        } catch (error) {
            console.error('Error populating GL Closing report hotel dropdown:', error);
            glReportUi.hotelSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderGlClosingReportViewTotals = (data) => {
        if (!glReportUi.tableFoot) return;
        if (!data || data.length === 0) {
            glReportUi.tableFoot.innerHTML = '';
            return;
        }

        const totals = {
            actual_revenue: 0, actual_expenses: 0,
            budget_revenue: 0, budget_expenses: 0,
        };

        data.forEach(row => {
            totals.actual_revenue += parseFloat(row.actual_revenue) || 0;
            totals.actual_expenses += parseFloat(row.actual_expenses) || 0;
            totals.budget_revenue += parseFloat(row.budget_revenue) || 0;
            totals.budget_expenses += parseFloat(row.budget_expenses) || 0;
        });

        const totalActualGop = totals.actual_revenue - totals.actual_expenses;
        const totalActualGopRatio = totals.actual_revenue !== 0 ? (totalActualGop / totals.actual_revenue) * 100 : 0;
        const totalBudgetGop = totals.budget_revenue - totals.budget_expenses;
        const totalBudgetGopRatio = totals.budget_revenue !== 0 ? (totalBudgetGop / totals.budget_revenue) * 100 : 0;

        const formatCurrency = (num) => (num || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatRatio = (num) => `${(num || 0).toFixed(2)} %`;

        glReportUi.tableFoot.innerHTML = `
            <tr>
                <td class="px-4 py-3 text-left text-sm font-semibold text-gray-800" colspan="2">Total</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800">${formatCurrency(totals.actual_revenue)}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800">${formatCurrency(totals.actual_expenses)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">${formatCurrency(totalActualGop)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">${formatRatio(totalActualGopRatio)}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800 border-l">${formatCurrency(totals.budget_revenue)}</td>
                <td class="px-4 py-3 text-right text-sm text-gray-800">${formatCurrency(totals.budget_expenses)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">${formatCurrency(totalBudgetGop)}</td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">${formatRatio(totalBudgetGopRatio)}</td>
                <td class="px-4 py-3"></td>
                <td class="px-4 py-3"></td>
            </tr>
        `;
    };

    const renderGlClosingReportViewTable = (data) => {
        currentGlClosingReportData = data || [];
        if (!glReportUi.tableBody) return;

        glReportUi.downloadButton.disabled = currentGlClosingReportData.length === 0;

        if (!data || data.length === 0) {
            glReportUi.tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="search" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan.</span>
                            <span class="text-sm">Coba ubah kriteria filter Anda.</span>
                        </div>
                    </td>
                </tr>`;
            renderGlClosingReportViewTotals([]);
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatCurrency = (num) => (parseFloat(num) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatRatio = (num) => `${(parseFloat(num) || 0).toFixed(2)} %`;
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        glReportUi.tableBody.innerHTML = data.map(row => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(row.report_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right border-l">${formatCurrency(row.actual_revenue)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.actual_expenses)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatCurrency(row.actual_gop)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatRatio(row.actual_gop_ratio)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right border-l">${formatCurrency(row.budget_revenue)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.budget_expenses)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatCurrency(row.budget_gop)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatRatio(row.budget_gop_ratio)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center border-l">
                    ${row.gdrive_link ? `<a href="${row.gdrive_link}" target="_blank" class="text-indigo-600 hover:text-indigo-900"><i data-feather="external-link" class="w-5 h-5"></i></a>` : '-'}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center border-l">
                    <button data-id="${row.id}" class="delete-gl-report-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors duration-200">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        renderGlClosingReportViewTotals(data);
        if (typeof feather !== 'undefined') feather.replace();
    };

    // --- Hotel Performance Report ---
    let hotelPerformanceChartInstance = null;

    const renderHotelPerformanceChart = (chartData) => {
        const canvas = ui.hotelPerformanceChart;
        if (!canvas) return;

        if (hotelPerformanceChartInstance) {
            hotelPerformanceChartInstance.destroy();
        }

        const labels = Object.keys(chartData);
        const statuses = ['Tepat Waktu', 'Menunggu', 'Terlambat', 'Processing Error'];
        // Warna baru yang lebih cerah untuk tampilan modern di background gelap
        const colors = {
            'Tepat Waktu': '#4ade80',      // green-400
            'Menunggu': '#facc15',       // yellow-400
            'Terlambat': '#f87171',      // red-400
            'Processing Error': '#94a3b8' // slate-400
        };

        const datasets = statuses.map(status => ({
            label: status,
            data: labels.map(hotel => chartData[hotel][status] || 0),
            backgroundColor: colors[status],
        }));

        hotelPerformanceChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                datasets: {
                    bar: {
                        borderRadius: 4,
                        borderSkipped: false, // agar border radius diterapkan di semua sisi
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 41, 59, 0.8)', // bg-slate-800 with opacity
                        titleFont: { size: 14, family: 'Inter, sans-serif' },
                        bodyFont: { size: 12, family: 'Inter, sans-serif' },
                        padding: 12,
                        cornerRadius: 6,
                        borderColor: 'rgba(148, 163, 184, 0.3)', // slate-400 with opacity
                        borderWidth: 1,
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1', // slate-300
                            padding: 20,
                            font: { size: 12, family: 'Inter, sans-serif' }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' } // slate-400
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8', stepSize: 1 } // slate-400
                    }
                }
            }
        });
    };

    const loadReportPerformancePage = async () => {
        const canvas = ui.hotelPerformanceChart;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'gray';
        ctx.textAlign = 'center';
        ctx.fillText('Memuat data performa...', canvas.width / 2, canvas.height / 2);

        try {
            const reportStatuses = await apiFetch(`${API_BASE_URL}/dashboard/status`);
            
            if (reportStatuses.length === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText('Tidak ada data untuk ditampilkan.', canvas.width / 2, canvas.height / 2);
                return;
            }

            // Process data: group by hotel and count statuses
            const processedData = reportStatuses.reduce((acc, report) => {
                const hotelName = report.hotel_name;
                const status = report.status;

                if (!acc[hotelName]) {
                    acc[hotelName] = {
                        'Tepat Waktu': 0,
                        'Menunggu': 0,
                        'Terlambat': 0,
                        'Processing Error': 0
                    };
                }
                if (acc[hotelName][status] !== undefined) {
                    acc[hotelName][status]++;
                }
                return acc;
            }, {});

            renderHotelPerformanceChart(processedData);

        } catch (error) {
            console.error('Gagal memuat data performa hotel:', error);
            showToast(`Gagal memuat data: ${error.message}`, 'error');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'red';
            ctx.fillText('Gagal memuat data.', canvas.width / 2, canvas.height / 2);
        }
    };

    const setupDeleteApAgingListeners = () => {
        if (!ui.deleteApAgingButton) return;
        ui.deleteApAgingButton.addEventListener('click', async () => {
            const hotelId = ui.deleteApAgingHotelSelector.value;
            const reportDate = ui.deleteApAgingDateSelector.value;
            if (!hotelId || !reportDate) return showToast('Pilih hotel dan tanggal laporan yang akan dihapus.', 'error');

            const hotelName = ui.deleteApAgingHotelSelector.options[ui.deleteApAgingHotelSelector.selectedIndex].text;
            const formattedDate = new Date(reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!confirm(`YAKIN?\n\nAnda akan menghapus SEMUA laporan AP Aging untuk:\nHotel: ${hotelName}\nTanggal: ${formattedDate}\n\nTindakan ini tidak dapat dibatalkan.`)) return;

            try {
                const params = new URLSearchParams({ hotel_id: hotelId, report_date: reportDate });
                const result = await apiFetch(`${API_BASE_URL}/ap-aging-reports?${params.toString()}`, { method: 'DELETE' });
                showToast(result.msg || 'Laporan berhasil dihapus.', 'success');
                ui.deleteApAgingHotelSelector.value = '';
                ui.deleteApAgingDateSelector.value = '';
            } catch (error) {
                showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
            }
        });
    };

    // --- SOH Inventory Report (Summary View) ---

    const loadSohReportSummaryPage = async () => {
        // This state flag is for the new summary page
        if (appState.isSohInventoryReportLoaded) return;
        if (!ui.reportSohHotelSelector) return;

        ui.reportSohHotelSelector.innerHTML = '<option value="">Memuat hotel...</option>';
        ui.reportSohHotelSelector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            ui.reportSohHotelSelector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                ui.reportSohHotelSelector.appendChild(option);
            });
            ui.reportSohHotelSelector.disabled = false;
            // Use a new state flag for the summary page to avoid conflicts
            appState.isSohInventoryReportLoaded = true;
        } catch (error) {
            console.error('Error populating SOH report hotel dropdown:', error);
            ui.reportSohHotelSelector.innerHTML = `<option value="">${error.message}</option>`;
        }
    };

    const renderSohSummaryTable = (data) => {
        currentSohSummaryData = data || [];
        const tableBody = ui.reportSohSummaryTableBody;
        if (!tableBody) return;

        ui.reportSohDownloadButton.disabled = currentSohSummaryData.length === 0;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="search" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Data tidak ditemukan</span>
                            <span class="text-sm">Coba ubah kriteria filter Anda.</span>
                        </div>
                    </td>
                </tr>`;
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        const formatCurrency = (num) => (parseFloat(num) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        tableBody.innerHTML = data.map(row => `
            <tr class="hover:bg-gray-50 cursor-pointer view-soh-detail-button" data-report-id="${row.id}">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatDate(row.report_date)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.total_food)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.total_beverage)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${formatCurrency(row.total_material)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">${formatCurrency(row.total_overall)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span class="text-indigo-600 hover:text-indigo-900 font-medium">
                        Lihat Detail
                    </span>
                </td>
            </tr>
        `).join('');
    };

    const fetchAndRenderSohDetail = async (reportId) => {
        if (!ui.sohDetailModal) return;

        ui.sohDetailModal.classList.remove('hidden');
        ui.sohDetailTableBody.innerHTML = `<tr><td colspan="10" class="text-center p-8">Memuat detail laporan...</td></tr>`;
        ui.sohDetailTableFoot.innerHTML = '';
        ui.sohDetailModalTitle.textContent = 'Detail Laporan SOH';

        try {
            // Backend needs to provide an endpoint like this
            const detailData = await apiFetch(`${API_BASE_URL}/soh-inventory-reports/detail/${reportId}`);
            
            if (detailData.length > 0) {
                const firstRow = detailData[0];
                const reportDate = new Date(firstRow.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                ui.sohDetailModalTitle.textContent = `Detail Laporan SOH - ${firstRow.hotel_name || ''} (${reportDate})`;
            }

            renderSohDetailTable(detailData);
        } catch (error) {
            ui.sohDetailTableBody.innerHTML = `<tr><td colspan="10" class="text-center p-8 text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderSohDetailTable = (data) => {
        currentSohDetailData = data || [];
        const tableBody = ui.sohDetailTableBody;
        const tableFoot = ui.sohDetailTableFoot;
        if (!tableBody || !tableFoot) return;

        if (currentSohDetailData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-8">Tidak ada data detail ditemukan.</td></tr>`;
            tableFoot.innerHTML = '';
            return;
        }

        const formatNumber = (num) => (parseFloat(num) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID');

        tableBody.innerHTML = currentSohDetailData.map(row => `
            <tr>
                <td class="px-4 py-2 text-sm text-gray-500">${formatDate(row.date)}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${row.storage}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${row.article}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${row.description}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${row.unit}</td>
                <td class="px-4 py-2 text-sm text-gray-500 text-right">${formatNumber(row.actual_qty)}</td>
                <td class="px-4 py-2 text-sm text-gray-500 text-right">${formatNumber(row.actual_value)}</td>
                <td class="px-4 py-2 text-sm text-gray-500 text-right">${formatNumber(row.act_p_price)}</td>
                <td class="px-4 py-2 text-sm text-gray-500 text-right">${formatNumber(row.avrg_price)}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${row.sub_group}</td>
            </tr>
        `).join('');

        const totalActualValue = currentSohDetailData.reduce((sum, row) => sum + (parseFloat(row.actual_value) || 0), 0);
        tableFoot.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-3 text-right font-bold text-gray-800">Total Nilai Aktual</td>
                <td class="px-4 py-3 text-right font-bold text-gray-800">${formatNumber(totalActualValue)}</td>
                <td colspan="3"></td>
            </tr>
        `;
    };

    // --- Report Target Management ---

    const renderReportTargetForms = (targets) => {
        if (!ui.reportTargetContainer) return;

        const reportConfigs = [
            { type: 'income_audit', name: 'Income Audit Daily', targetType: 'daily' },
            { type: 'ar_aging', name: 'AR Aging Weekly', targetType: 'weekly' },
            { type: 'ap_aging', name: 'AP Aging Weekly', targetType: 'weekly' },
            { type: 'soh_inventory', name: 'SOH Inventory Weekly', targetType: 'weekly' },
            { type: 'service_charge', name: 'Service Charge Monthly', targetType: 'monthly' },
            { type: 'gl_closing', name: 'After Closing GL Monthly', targetType: 'monthly' },
        ];

        let formsHtml = reportConfigs.map(config => {
            const currentTarget = targets[config.type] || {};
            let inputsHtml = '';

            switch (config.targetType) {
                case 'daily':
                    inputsHtml = `
                        <p class="text-sm text-gray-500 mt-1 mb-4">Setiap hari, sebelum jam:</p>
                        <input type="time" name="target_time" value="${currentTarget.target_time ? currentTarget.target_time.substring(0, 5) : '09:00'}" required class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    `;
                    break;
                case 'weekly':
                    const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const dayOptions = daysOfWeek.map((day, index) => 
                        `<option value="${index}" ${currentTarget.day_of_week == index ? 'selected' : ''}>${day}</option>`
                    ).join('');
                    inputsHtml = `
                        <p class="text-sm text-gray-500 mt-1 mb-2">Setiap hari:</p>
                        <select name="day_of_week" required class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mb-4">
                            ${dayOptions}
                        </select>
                        <p class="text-sm text-gray-500 mb-1">Sebelum jam:</p>
                        <input type="time" name="target_time" value="${currentTarget.target_time ? currentTarget.target_time.substring(0, 5) : '15:00'}" required class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    `;
                    break;
                case 'monthly':
                    inputsHtml = `
                        <p class="text-sm text-gray-500 mt-1 mb-2">Setiap tanggal:</p>
                        <input type="number" name="day_of_month" value="${currentTarget.day_of_month || 5}" min="1" max="31" required class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm mb-4">
                        <p class="text-sm text-gray-500 mb-1">Sebelum jam:</p>
                        <input type="time" name="target_time" value="${currentTarget.target_time ? currentTarget.target_time.substring(0, 5) : '17:00'}" required class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    `;
                    break;
            }

            return `
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <form class="report-target-form" data-report-type="${config.type}" data-target-type="${config.targetType}">
                        <h3 class="text-lg font-semibold text-gray-800">${config.name}</h3>
                        <div class="mt-4">
                            ${inputsHtml}
                        </div>
                        <button type="submit" class="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center">
                            <i data-feather="save" class="w-4 h-4 mr-2"></i>
                            Simpan
                        </button>
                    </form>
                </div>
            `;
        }).join('');

        ui.reportTargetContainer.innerHTML = formsHtml;
        if (typeof feather !== 'undefined') feather.replace();
    };

    const loadReportTargetManagementPage = async () => {
        if (appState.isReportTargetManagementLoaded) return;
        if (!ui.reportTargetContainer) return;

        try {
            const targets = await apiFetch(`${API_BASE_URL}/report-targets`);
            renderReportTargetForms(targets);
            appState.isReportTargetManagementLoaded = true;
        } catch (error) {
            ui.reportTargetContainer.innerHTML = `<div class="col-span-full text-center text-red-500 p-8">${error.message}</div>`;
        }
    };

    const setupReportTargetListeners = () => {
        if (!ui.reportTargetContainer) return;

        ui.reportTargetContainer.addEventListener('submit', async (e) => {
            if (e.target && e.target.classList.contains('report-target-form')) {
                e.preventDefault();
                const form = e.target;
                const formData = new FormData(form);
                const payload = {
                    report_type: form.dataset.reportType,
                    target_type: form.dataset.targetType,
                    target_time: formData.get('target_time'),
                    day_of_week: formData.get('day_of_week') ? parseInt(formData.get('day_of_week')) : null,
                    day_of_month: formData.get('day_of_month') ? parseInt(formData.get('day_of_month')) : null,
                };

                try {
                    await apiFetch(`${API_BASE_URL}/report-targets`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    showToast(`Target untuk ${payload.report_type.replace(/_/g, ' ')} berhasil disimpan.`, 'success');
                } catch (error) {
                    showToast(`Gagal menyimpan target: ${error.message}`, 'error');
                }
            }
        });
    };

    // --- Dashboard: Recent Activities ---
    const renderRecentActivities = (agendas) => {
        const list = document.getElementById('recent-activity-list');
        if (!list) return;
        list.innerHTML = '';

        if (!agendas || agendas.length === 0) {
            list.innerHTML = `<li class="text-gray-500">Tidak ada aktivitas terbaru.</li>`;
            return;
        }

        // Ambil 5 aktivitas terbaru
        const recentAgendas = agendas.slice(0, 5);
        const fragment = document.createDocumentFragment();

        recentAgendas.forEach(agenda => {
            const li = document.createElement('li');
            li.className = 'flex items-center text-gray-600 text-sm';

            const props = agenda.extendedProps || {};
            const status = props.status || agenda.status || 'Terjadwal';
            const hotelName = agenda.title.replace(/Audit.*?: /, '').trim();
            const auditorName = props.auditor_name;
            const date = new Date(agenda.created_at || agenda.start);

            let icon = 'calendar';
            let color = 'text-gray-500';
            let activityText = `Agenda untuk ${hotelName} telah dijadwalkan.`;
            const auditorInfo = auditorName ? ` (oleh ${auditorName})` : '';

            switch (status) {
                case 'Sedang Proses':
                    icon = 'play-circle';
                    color = 'text-blue-500';
                    activityText = `Audit untuk ${hotelName} sedang berlangsung${auditorInfo}.`;
                    break;
                case 'Selesai':
                    icon = 'check-circle';
                    color = 'text-green-500';
                    activityText = `Audit untuk ${hotelName} telah selesai${auditorInfo}.`;
                    break;
                case 'Dibatalkan':
                    icon = 'x-circle';
                    color = 'text-red-500';
                    activityText = `Audit untuk ${hotelName} telah dibatalkan${auditorInfo}.`;
                    break;
                case 'Terjadwal':
                    icon = 'calendar';
                    color = 'text-indigo-500';
                    activityText = `Audit untuk ${hotelName} telah dijadwalkan${auditorInfo}.`;
                    break;
            }

            const timeAgo = (d) => {
                const now = new Date();
                const seconds = Math.floor((now - d) / 1000);
                if (seconds < 60) return `beberapa detik lalu`;
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes} menit lalu`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours} jam lalu`;
                const days = Math.floor(hours / 24);
                return `${days} hari lalu`;
            };

            li.innerHTML = `
                <i data-feather="${icon}" class="w-5 h-5 ${color} mr-3 flex-shrink-0"></i>
                <span>${activityText} <span class="text-gray-400 text-xs ml-1">(${timeAgo(date)})</span></span>
            `;
            fragment.appendChild(li);
        });

        list.appendChild(fragment);
        if (typeof feather !== 'undefined') feather.replace();
    };

    const loadRecentActivities = async () => {
        const list = document.getElementById('recent-activity-list');
        if (!list) return;
        
        try {
            const agendas = await apiFetch(`${API_BASE_URL}/agendas`);
            renderRecentActivities(agendas);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat aktivitas terbaru:', error);
            if (list) {
                list.innerHTML = `<li class="text-red-500">Gagal memuat aktivitas: ${error.message}</li>`;
            }
        }
    };

    const renderDashboardMetrics = (metrics) => {
        if (ui.metricScheduled) ui.metricScheduled.textContent = metrics.scheduled || 0;
        if (ui.metricCompleted) ui.metricCompleted.textContent = metrics.completed || 0;
        if (ui.metricInProgress) ui.metricInProgress.textContent = metrics.in_progress || 0;
    };

    const renderAuditStatusChart = (metrics, retries = 10) => {
        if (typeof Chart === 'undefined') {
            if (retries > 0) {
                console.warn(`[Chart.js] Library belum siap. Mencoba lagi... (${retries} percobaan tersisa)`);
                setTimeout(() => renderAuditStatusChart(metrics, retries - 1), 200);
            } else {
                console.error('[Chart.js] Gagal memuat library Chart.js setelah beberapa kali percobaan.');
                const ctx = document.getElementById('audit-status-chart');
                if (ctx) {
                    const context = ctx.getContext('2d');
                    const { width, height } = ctx;
                    context.clearRect(0, 0, width, height);
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.font = '12px "Inter", sans-serif';
                    context.fillStyle = '#ef4444'; // text-red-500
                    context.fillText('Gagal memuat grafik.', width / 2, height / 2 - 10);
                    context.fillStyle = '#6b7280'; // text-gray-500
                    context.font = '10px "Inter", sans-serif';
                    context.fillText('Periksa koneksi internet Anda.', width / 2, height / 2 + 10);
                }
                showToast('Gagal memuat grafik. Periksa koneksi.', 'error');
            }
            return;
        }

        const ctx = document.getElementById('audit-status-chart');
        if (!ctx) {
            console.warn('[Chart] Elemen canvas #audit-status-chart tidak ditemukan.');
            return;
        }
    
        // Hancurkan chart lama jika ada, untuk mencegah duplikasi saat refresh
        if (auditStatusChart) {
            auditStatusChart.destroy();
        }
    
        // Cek jika tidak ada data sama sekali
        const totalAudits = (metrics.completed || 0) + (metrics.in_progress || 0) + (metrics.scheduled || 0);
        if (totalAudits === 0) {
            const context = ctx.getContext('2d');
            const { width, height } = ctx;
            context.clearRect(0, 0, width, height);
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = '14px "Inter", sans-serif';
            context.fillStyle = '#6b7280'; // text-gray-500
            context.fillText('Tidak ada data audit.', width / 2, height / 2);
            return;
        }
    
        auditStatusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Selesai', 'Sedang Proses', 'Terjadwal'],
                datasets: [{
                    label: 'Status Audit',
                    data: [metrics.completed || 0, metrics.in_progress || 0, metrics.scheduled || 0],
                    backgroundColor: ['#10B981', '#FBBF24', '#3B82F6'], // Selesai, Proses, Terjadwal
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            boxWidth: 12,
                            font: {
                                family: '"Inter", sans-serif',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}`
                        }
                    }
                }
            }
        });
    };

    const loadDashboardMetrics = async () => {
        // Jangan jalankan jika elemen tidak ada di halaman
        if (!ui.metricScheduled) return;

        try {
            // CATATAN: Endpoint ini perlu dibuat di backend dan di-routing
            const metrics = await apiFetch(`${API_BASE_URL}/agendas/metrics`);
            renderDashboardMetrics(metrics);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat metrik dasbor:', error);
            // Tampilkan fallback jika gagal
            showToast(error.message, 'error');
            renderDashboardMetrics({ scheduled: 'N/A', completed: 'N/A', in_progress: 'N/A' });
        }
    };

    // --- Dashboard: Report Submission Status ---

    // Fungsi untuk memformat tanggal agar mudah dibaca (misal: Senin, 20 Mei 2024 09:00)
    const formatDate = (dateString) => {
        if (!dateString) return '-'; // Jika tanggal null, tampilkan strip
        const date = new Date(dateString);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta' // Sesuaikan dengan zona waktu Anda
        };
        return date.toLocaleDateString('id-ID', options);
    };

    // Fungsi untuk "menggambar" atau merender data status ke dalam tabel HTML
    const renderDashboardReportStatus = (statuses) => {
        // Cari elemen <tbody> di HTML Anda
        const tableBody = document.getElementById('dashboard-status-table-body');
        if (!tableBody) {
            console.warn('[Dasbor] Elemen #dashboard-status-table-body tidak ditemukan di HTML.');
            return;
        }

        // Cari kontainer tabel dan tambahkan kelas untuk scroll
        // Asumsi struktur HTML adalah: <div class="..."><table ...><tbody>...</tbody></table></div>
        const tableContainer = tableBody.parentElement.parentElement;
        if (tableContainer) {
            tableContainer.classList.add('dashboard-scrollable-table-container');
        }
        tableBody.innerHTML = ''; // Kosongkan isi tabel sebelum diisi data baru

        if (!statuses || statuses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Tidak ada target laporan yang diatur.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        statuses.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';

            let statusClass, statusIcon, statusText;
            switch (item.status) {
                case 'Tepat Waktu':
                    statusClass = 'bg-green-100 text-green-800';
                    statusIcon = `<i data-feather="check-circle" class="w-4 h-4 mr-2"></i>`;
                    statusText = 'Tepat Waktu';
                    break;
                case 'Menunggu':
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    statusIcon = `<i data-feather="clock" class="w-4 h-4 mr-2"></i>`;
                    statusText = 'Menunggu';
                    break;
                case 'Terlambat':
                    statusClass = 'bg-red-100 text-red-800';
                    statusIcon = `<i data-feather="alert-triangle" class="w-4 h-4 mr-2"></i>`;
                    statusText = 'Terlambat';
                    break;
                case 'Processing Error':
                    statusClass = 'bg-red-100 text-red-800 font-bold';
                    statusIcon = `<i data-feather="alert-octagon" class="w-4 h-4 mr-2"></i>`;
                    statusText = 'Error';
                    break;
                default: // Termasuk 'Konfigurasi Error'
                    statusClass = 'bg-gray-100 text-gray-800';
                    statusIcon = `<i data-feather="help-circle" class="w-4 h-4 mr-2"></i>`;
                    statusText = item.status;
            }

            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${item.hotel_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${item.report_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon}
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${formatDate(item.last_submission)}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${formatDate(item.next_deadline)}</td>
            `;
            fragment.appendChild(tr);
        });

        tableBody.appendChild(fragment);
        if (typeof feather !== 'undefined') feather.replace(); // Render ikon
    };

    // Fungsi baru untuk mengisi dropdown filter dan menambahkan event listener
    async function populateDashboardFilters() {
        if (appState.isDashboardFiltersLoaded) return;

        const hotelSelector = document.getElementById('filter-hotel');
        const reportTypeSelector = document.getElementById('filter-report-type');
        const statusSelector = document.getElementById('filter-status');

        if (!hotelSelector || !reportTypeSelector || !statusSelector) return;

        // --- Populate Hotel Filter ---
        try {
            hotelSelector.innerHTML = '<option value="">Memuat hotel...</option>';
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            hotelSelector.innerHTML = '<option value="">Semua Hotel</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                hotelSelector.appendChild(option);
            });
        } catch (e) {
            hotelSelector.innerHTML = `<option value="">Gagal memuat</option>`;
            console.error('Gagal memuat hotel untuk filter:', e);
        }

        // --- Populate Report Type Filter ---
        const reportNameMap = {
            'income_audit': 'Income Audit Daily',
            'ar_aging': 'AR Aging Weekly',
            'ap_aging': 'AP Aging Weekly',
            'soh_inventory': 'SOH Inventory Weekly',
            'service_charge': 'Service Charge Monthly',
            'gl_closing': 'After Closing GL Monthly',
        };

        try {
            reportTypeSelector.innerHTML = '<option value="">Memuat tipe...</option>';
            // Asumsi endpoint ini mengembalikan semua target yang mungkin
            const targets = await apiFetch(`${API_BASE_URL}/report-targets`);
            reportTypeSelector.innerHTML = '<option value="">Semua Tipe Laporan</option>';
            
            const uniqueReportTypes = [...new Set(Object.values(targets).map(t => t.report_type))];
            uniqueReportTypes.sort().forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = reportNameMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                reportTypeSelector.appendChild(option);
            });
        } catch (e) {
            reportTypeSelector.innerHTML = `<option value="">Gagal memuat</option>`;
            console.error('Gagal memuat tipe laporan untuk filter:', e);
        }

        // --- Add Event Listeners ---
        [hotelSelector, reportTypeSelector, statusSelector].forEach(selector => {
            selector.addEventListener('change', loadDashboardReportStatus);
        });

        appState.isDashboardFiltersLoaded = true;
    }

    // Fungsi utama yang dipanggil dari loadDashboardPage
    const loadDashboardReportStatus = async () => {
        const tableBody = document.getElementById('dashboard-status-table-body');
        if (!tableBody) return;

        // Kumpulkan nilai dari semua filter
        const hotelId = document.getElementById('filter-hotel')?.value;
        const reportType = document.getElementById('filter-report-type')?.value;
        const status = document.getElementById('filter-status')?.value;

        // Bangun URL dengan parameter query
        const params = new URLSearchParams();
        if (hotelId) params.append('hotel_id', hotelId);
        if (reportType) params.append('report_type', reportType);
        if (status) params.append('status', status);

        const url = `${API_BASE_URL}/dashboard/status?${params.toString()}`;

        try {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Memuat status...</td></tr>`;
            const statuses = await apiFetch(url);
            renderDashboardReportStatus(statuses);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat status pengiriman laporan:', error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Gagal memuat status: ${error.message}</td></tr>`;
            }
        }
    };

    // Fungsi baru untuk mengelompokkan logika filter dan pemuatan data
    async function setupDashboardStatusSection() {
        await populateDashboardFilters();
        await loadDashboardReportStatus();
    }

    const setupDashboardListeners = () => {
        const refreshButton = document.getElementById('refresh-dashboard-status');
        if (refreshButton) {
            // Hindari menambahkan listener berulang kali jika fungsi ini dipanggil lagi
            if (refreshButton.dataset.listenerAttached) return;

            refreshButton.addEventListener('click', async () => {
                // Memberikan umpan balik visual saat me-refresh
                const icon = refreshButton.querySelector('i');
                const originalIcon = icon.dataset.feather;
                
                icon.dataset.feather = 'loader'; // Ganti ikon menjadi loader
                icon.classList.add('animate-spin');
                if (typeof feather !== 'undefined') feather.replace();
                refreshButton.disabled = true;

                try {
                    await loadDashboardReportStatus();
                    showToast('Status laporan berhasil diperbarui.', 'success');
                } finally {
                    // Kembalikan tombol ke keadaan semula setelah selesai
                    icon.dataset.feather = originalIcon;
                    icon.classList.remove('animate-spin');
                    if (typeof feather !== 'undefined') feather.replace();
                    refreshButton.disabled = false;
                }
            });
            refreshButton.dataset.listenerAttached = 'true';
        }
    };

    async function populateAgendaHotels() {
        const selector = document.getElementById('event-hotel-id');
        if (!selector) return;
        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;
        } catch (error) {
            console.error('Error populating hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    }

    async function populateIncomeAuditHotels() {
        const selector = document.getElementById('income-audit-hotel-selector');
        if (!selector) return;
        selector.innerHTML = '<option value="">Memuat hotel...</option>';
        selector.disabled = true;

        try {
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            selector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
            hotels.forEach(hotel => {
                const option = document.createElement('option');
                option.value = hotel.id;
                option.textContent = hotel.name;
                selector.appendChild(option);
            });
            selector.disabled = false;

            // Juga isi dropdown untuk bagian hapus
            const deleteSelector = ui.deleteIncomeAuditHotelSelector;
            if (deleteSelector) {
                deleteSelector.innerHTML = '<option value="">-- Pilih Hotel --</option>';
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    deleteSelector.appendChild(option);
                });
                deleteSelector.disabled = false;
            }


        } catch (error) {
            console.error('Error populating income audit hotel dropdown:', error);
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    }

    const openAgendaModal = (mode, eventData = {}) => {
        const modal = ui.addEventModal;
        if (!modal) return;

        const form = ui.addEventForm;
        const modalTitle = document.getElementById('event-modal-title');
        const saveButton = document.getElementById('save-event-button');
        const deleteButton = document.getElementById('delete-event-button');
        const userRole = getCurrentUserRole()?.toLowerCase();

        form.reset();
        form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
        form.elements['id'].value = '';

        if (mode === 'add') {
            if (userRole !== 'admin') {
                console.warn('Hanya admin yang dapat menambahkan agenda baru.');
                return;
            }
            modalTitle.textContent = 'Tambah Agenda Baru';
            saveButton.style.display = 'inline-block';
            deleteButton.style.display = 'none';

            // Isi tanggal dari info kalender
            // PERBAIKAN: Jika dateStr tidak ada (dipanggil dari tabel), default ke hari ini.
            const today = new Date().toISOString().split('T')[0];
            form.elements['start_date'].value = eventData.dateStr || today;
            form.elements['end_date'].value = eventData.dateStr || today;
            
            populateAgendaAuditTypes();
            populateAgendaHotels();

        } else if (mode === 'view') {
            const event = eventData;
            modalTitle.textContent = 'Detail Agenda';
            saveButton.style.display = 'none';
            deleteButton.style.display = userRole === 'admin' ? 'inline-block' : 'none';

            // Tampilkan tombol checklist jika ada tipe audit
            const checklistButton = document.getElementById('checklist-agenda-button');
            if (event.extendedProps.audit_type_id) {
                const auditTypeName = event.title.match(/Audit (.*?):/)?.[1] || 'Audit';
                checklistButton.style.display = 'inline-flex';
                checklistButton.dataset.auditTypeId = event.extendedProps.audit_type_id;
                checklistButton.dataset.auditTypeName = auditTypeName;
            } else {
                checklistButton.style.display = 'none';
            }
            
            // PERBAIKAN: Simpan ID event ke dalam form agar bisa digunakan untuk hapus/edit.
            form.elements['id'].value = event.id;

            const start = new Date(event.start);
            const end = event.end ? new Date(event.end) : start;
            form.elements['start_date'].value = start.toISOString().split('T')[0];
            form.elements['start_time'].value = start.toTimeString().substring(0, 5);
            form.elements['end_date'].value = end.toISOString().split('T')[0];
            form.elements['end_time'].value = event.end ? end.toTimeString().substring(0, 5) : '';

            // PERBAIKAN: Pilih status yang benar di dropdown berdasarkan data event
            const statusSelect = form.elements['status'];
            if (statusSelect) {
                statusSelect.value = event.extendedProps.status || 'Terjadwal';
            }
            form.elements['description'].value = event.extendedProps.description || '';

            // Nonaktifkan field karena ini mode lihat
            form.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
            form.elements['id'].disabled = false; // Pastikan ID tetap aktif untuk dibaca

            // Isi dropdown hotel dan tipe audit, lalu pilih yang sesuai
            Promise.all([
                populateAgendaHotels(),
                populateAgendaAuditTypes()
            ]).then(() => {
                if (event.extendedProps.hotel_id) {
                    form.elements['hotel_id'].value = event.extendedProps.hotel_id;
                }
                if (event.extendedProps.audit_type_id) {
                    form.elements['audit_type_id'].value = event.extendedProps.audit_type_id;
                }
            });
        }

        modal.classList.remove('hidden');
    };

    // --- Calendar / Agenda Management ---
    let calendar = null; // Variabel untuk menyimpan instance kalender agar tidak duplikat

    /**
     * Menginisialisasi dan merender FullCalendar.
     */
    const initializeCalendar = async () => { // 1. Jadikan fungsi ini async
        // Jika kalender sudah ada, cukup segarkan datanya. Jangan buat ulang.
        if (appState.isCalendarInitialized && calendar) {
            calendar.refetchEvents();
            return;
        }

        const calendarEl = document.getElementById('calendar-container');
        if (!calendarEl) {
            console.warn('[Calendar] Elemen #calendar-container tidak ditemukan.');
            return;
        }

        // Hapus instance lama jika ada (sebagai pengaman)
        if (calendar) {
            calendar.destroy();
        }

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            // Gunakan 'events' sebagai fungsi untuk memuat data secara dinamis dari API
            events: async (fetchInfo, successCallback, failureCallback) => {
                try {
                    // Gunakan apiFetch untuk memuat event
                    const agendaData = await apiFetch(`${API_BASE_URL}/agendas`);
                    const events = agendaData.map(item => {
                        // PERBAIKAN: Buat judul yang lebih deskriptif
                        const props = item.extendedProps || {};
                        const hotelName = item.title.replace(/Audit.*?: /, '').trim();
                        const auditorName = props.auditor_name || 'N/A';
                        const newTitle = `${hotelName}\nAuditor: ${auditorName}`;

                        return {
                            ...item,
                            title: newTitle, // Gunakan judul baru
                            backgroundColor: item.color,
                            borderColor: item.color,
                        };
                    });
                    successCallback(events);
                } catch (error) {
                    console.error('[Calendar] Gagal memuat acara:', error);
                    failureCallback(error);
                }
            },
            locale: 'id', // Mengatur bahasa ke Indonesia
            buttonText: { today: 'Hari Ini', month: 'Bulan', week: 'Minggu', list: 'Daftar' },
            selectable: true, // Memungkinkan pemilihan tanggal
            dateClick: (info) => openAgendaModal('add', info),
            eventClick: (info) => openAgendaModal('view', info.event)
        });

        calendar.render();
        appState.isCalendarInitialized = true; // <-- Tandai bahwa kalender sudah diinisialisasi
    };

    /**
     * Mengambil dan mengisi dropdown tipe audit di dalam modal agenda.
     */
    async function populateAgendaAuditTypes() {
        const selector = document.getElementById('add-event-audit-type');
        if (!selector) return;
        selector.innerHTML = '<option value="">Memuat tipe audit...</option>';
        selector.disabled = true;

        try {
            const auditTypes = await apiFetch(`${API_BASE_URL}/audit-types`);
            selector.innerHTML = '<option value="">-- Pilih Tipe Audit --</option>';
            auditTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                selector.appendChild(option);
            });
            selector.disabled = false;
        } catch (error) {
            selector.innerHTML = `<option value="">${error.message}</option>`;
        }
    }

    const loadDashboardPage = async () => {
        // Panggil endpoint yang diperlukan secara paralel
        const [agendasResponse] = await Promise.all([
            apiFetch(`${API_BASE_URL}/agendas`).catch(e => ({ error: e, data: [] })),
            setupDashboardStatusSection() // Ini bisa berjalan sendiri
        ]);
    
        // Tangani kemungkinan error dari API call
        if (agendasResponse.error) {
            console.error('[KESALAHAN] Gagal memuat data dasbor:', agendasResponse.error);
            showToast(agendasResponse.error.message, 'error');
            // Tampilkan fallback jika gagal total
            renderRecentActivities([]);
            renderDashboardMetrics({ scheduled: 'N/A', completed: 'N/A', in_progress: 'N/A' });
            renderAuditStatusChart({ scheduled: 0, completed: 0, in_progress: 0 }); // Gunakan 0 untuk chart
            return;
        }

        const agendas = agendasResponse; // Jika tidak ada error, ini adalah array agenda
    
        // --- Kalkulasi Metrik di Frontend untuk Konsistensi Data ---
        const metrics = {
            scheduled: 0,
            completed: 0,
            in_progress: 0,
        };

        agendas.forEach(agenda => {
            const props = agenda.extendedProps || {};
            const status = props.status || agenda.status || 'Terjadwal';
            if (status === 'Selesai') metrics.completed++;
            else if (status === 'Sedang Proses') metrics.in_progress++;
            else if (status === 'Terjadwal') metrics.scheduled++;
            // Status 'Dibatalkan' diabaikan dari metrik utama
        });
    
        // Render semua komponen dengan data yang konsisten
        renderRecentActivities(agendas);
        renderDashboardMetrics(metrics);
        renderAuditStatusChart(metrics);
    };    

    // 3. Page-specific Data Loaders
    // This object maps a page ID to a function that loads its data.
    const pageLoaders = {
        'dashboard': { loader: loadDashboardPage },
        'role-management': { loader: loadRoles, stateFlag: 'isRolesLoaded' },
        'agenda': { loader: loadAgendasTable, stateFlag: 'isAgendasTableLoaded' },
        'user-management': { loader: loadUsers, stateFlag: 'isUsersLoaded' },
        'hotel-management': { loader: loadHotels, stateFlag: 'isHotelsLoaded' },
        'audit-type-management': { loader: loadAuditTypes, stateFlag: 'isAuditTypesLoaded' },
        'audit-checklist-management': { loader: loadChecklistManagementPage, stateFlag: 'isChecklistPageInitialized' },
        'calendar': { loader: initializeCalendar, stateFlag: 'isCalendarInitialized' },
        'report-agenda': { loader: loadAuditReports, stateFlag: 'isReportsLoaded' },        
        'submit-income-audit': { loader: populateIncomeAuditHotels, stateFlag: 'isIncomeAuditReportLoaded' },
        'report-ar-aging': { loader: loadArAgingReportViewPage, stateFlag: 'isArAgingReportViewLoaded' },
        'report-ap-aging': { loader: loadApAgingReportViewPage, stateFlag: 'isApAgingReportViewLoaded' },
        'submit-ar-aging': { loader: loadArAgingReportPage, stateFlag: 'isArAgingReportLoaded' },
        'report-soh': { loader: loadSohReportSummaryPage, stateFlag: 'isSohInventoryReportLoaded' },
        'submit-ap-aging': { loader: loadApAgingReportPage, stateFlag: 'isApAgingReportLoaded' },
        'submit-soh-inventory': { loader: loadSohInventoryReportPage, stateFlag: 'isSohInventoryReportLoaded' },
        'submit-service-charge': { loader: loadServiceChargeReportPage, stateFlag: 'isServiceChargeReportLoaded' },
        'report-target-management': { loader: loadReportTargetManagementPage, stateFlag: 'isReportTargetManagementLoaded' },
        'submit-gl-closing': { loader: loadGlClosingPage, stateFlag: 'isGlClosingReportLoaded' },
        'report-income-audit': { loader: loadIncomeAuditSummaryPage, stateFlag: 'isIncomeAuditSummaryLoaded' },
        'report-service-charge': { loader: loadServiceChargeReportViewPage, stateFlag: 'isServiceChargeReportViewLoaded' },
        'report-performance': { loader: loadReportPerformancePage, stateFlag: 'isReportPerformanceLoaded' },
        'report-gl-closing': { loader: loadGlClosingReportViewPage, stateFlag: 'isGlClosingReportViewLoaded' },
        'sop-aplikasi': { loader: () => {} }, // Halaman statis, tidak perlu loader khusus
    };

    const navigateTo = async (targetId, clickedElement = null) => {
        showContent(targetId); // Tampilkan section yang benar
        updateActiveSidebarLink(targetId, clickedElement); // Highlight menu sidebar
        updatePageTitle(targetId, clickedElement); // Ubah judul halaman
        
        const pageStateFlag = pageLoaders[targetId]?.stateFlag;
        if (pageStateFlag && appState[pageStateFlag]) {
            // Jika halaman kalender, segarkan event-nya
            if (targetId === 'calendar' && calendar) {
                calendar.refetchEvents();
            }
            return;
        }

        if (pageLoaders[targetId]?.loader) {
            try {
                await pageLoaders[targetId].loader();
                if (pageStateFlag) {
                    appState[pageStateFlag] = true;
                }
            } catch (error) {
                console.error(`[KESALAHAN FATAL] Gagal memuat data untuk halaman '${targetId}':`, error);
            }
        }
    };

    // --- Hotel Management ---
    /**
     * Memuat dan merender data hotel dari API.
     */
    async function loadHotels() {
        // Fungsi ini sekarang menjadi fungsi murni untuk memuat/menyegarkan data.
        // Pengecekan state dipindahkan ke `navigateTo`.
        const tableBody = document.getElementById('hotel-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">Memuat data hotel...</td></tr>`;

        try {
            // Gunakan apiFetch untuk konsistensi
            const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
            renderHotels(hotels);
        } catch (error) {
            console.error('[KESALAHAN] Gagal memuat data hotel:', error);
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red-500">Gagal memuat data. Silakan coba lagi.</td></tr>`;
        }
    }

    /**
     * Merender data hotel ke dalam tabel HTML.
     * @param {Array} hotels - Array objek hotel.
     */
    function renderHotels(hotels) {
        const tableBody = document.getElementById('hotel-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (hotels.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">Belum ada hotel yang ditambahkan.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        const canEdit = hasPermission('edit:hotels');
        const canDelete = hasPermission('delete:hotels');

        hotels.forEach(hotel => {
            const tr = document.createElement('tr');
            tr.dataset.id = hotel.id;
            tr.dataset.name = hotel.name;
            tr.dataset.address = hotel.address;

            const actionButtons = (canEdit || canDelete)
                ? `${canEdit ? `<button class="edit-hotel-button text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>` : ''}
                   ${canDelete ? `<button class="delete-hotel-button text-red-600 hover:text-red-900">Hapus</button>` : ''}`
                : '';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${hotel.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${hotel.address}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${actionButtons}
                </td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    }

    // ===================================================================
    // 4. EVENT LISTENER SETUP FUNCTIONS
    // ===================================================================
    const setupUserManagement = () => {
        if (!ui.addUserButton || !ui.editUserModal || !ui.userTableBody) return;

        // Secara dinamis menambahkan field multi-select untuk akses hotel ke dalam form
        const roleSelect = ui.editUserForm.elements['role_id'];
        if (roleSelect && !document.getElementById('hotel-access-wrapper')) { // Cek agar tidak duplikat
            const roleWrapper = roleSelect.closest('div'); // Asumsi <select> dibungkus <div>
            if (roleWrapper) {
                const hotelAccessHtml = `
                    <div id="hotel-access-wrapper" class="mt-4">
                        <label for="hotel-access-select" class="block text-sm font-medium text-gray-700">Akses Hotel</label>
                        <select id="hotel-access-select" name="hotel_ids" multiple class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-32">
                            <!-- Opsi akan diisi oleh JavaScript -->
                        </select>
                        <p class="mt-2 text-sm text-gray-500">Tahan Ctrl (atau Cmd di Mac) untuk memilih lebih dari satu hotel.</p>
                    </div>
                `;
                roleWrapper.insertAdjacentHTML('afterend', hotelAccessHtml);
            }
        }

        // Helper function to populate roles dropdown in the modal
        const populateRolesDropdown = async (selectElement, selectedRoleId = null) => {
            try {
                const roles = await apiFetch(`${API_BASE_URL}/roles`);
                selectElement.innerHTML = '<option value="">-- Pilih Peran --</option>';
                roles.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.id;
                    option.textContent = role.name;
                    if (role.id === selectedRoleId) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            } catch (error) {
                console.error(error);
                selectElement.innerHTML = `<option value="">${error.message}</option>`;
            }
        };

        // Helper function to populate hotels multi-select in the modal
        const populateHotelsDropdown = async (selectElement, selectedHotelIds = []) => {
            if (!selectElement) return;
            try {
                const hotels = await apiFetch(`${API_BASE_URL}/hotels`);
                selectElement.innerHTML = ''; // Hapus opsi yang ada
                hotels.forEach(hotel => {
                    const option = document.createElement('option');
                    option.value = hotel.id;
                    option.textContent = hotel.name;
                    // Cek apakah ID hotel saat ini ada di dalam daftar ID yang sudah dipilih
                    if (selectedHotelIds.includes(hotel.id)) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            } catch (error) {
                console.error(error);
                selectElement.innerHTML = `<option disabled>${error.message}</option>`;
            }
        };

        // Helper function to open the modal for editing a user
        const openUserModalForEdit = async (userId) => {
            try {
                const user = await apiFetch(`${API_BASE_URL}/users/${userId}`);
                ui.editUserModalTitle.textContent = 'Edit Pengguna';
                ui.editUserForm.reset();
                ui.editUserForm.elements['id'].value = user.id;
                ui.editUserForm.elements['username'].value = user.username;
                ui.editUserForm.elements['username'].disabled = true;
                ui.editUserForm.elements['full_name'].value = user.full_name;
                ui.editUserForm.elements['email'].value = user.email;
                ui.editUserForm.elements['password'].required = false;
                ui.editUserForm.elements['password'].placeholder = 'Kosongkan jika tidak ingin diubah';

                // Mengisi dan memilih hotel yang sesuai untuk pengguna
                const hotelSelect = document.getElementById('hotel-access-select');
                // Asumsi API mengembalikan user.hotel_ids sebagai array [1, 5]
                const userHotelIds = user.hotel_ids || [];
                await populateHotelsDropdown(hotelSelect, userHotelIds);

                await populateRolesDropdown(ui.editUserForm.elements['role_id'], user.role_id);

                ui.editUserModal.classList.remove('hidden');
            } catch (error) {
                console.error('Error opening edit modal:', error);
                showToast(error.message, 'error');
            }
        };

        // Helper function to open the modal for creating a new user
        const openUserModalForCreate = async () => {
            ui.editUserModalTitle.textContent = 'Tambah Pengguna Baru';
            ui.editUserForm.reset();
            ui.editUserForm.elements['id'].value = '';
            ui.editUserForm.elements['username'].disabled = false;
            ui.editUserForm.elements['password'].placeholder = '';
            ui.editUserForm.elements['password'].required = true;

            // Mengisi daftar hotel tanpa ada yang dipilih
            const hotelSelect = document.getElementById('hotel-access-select');
            await populateHotelsDropdown(hotelSelect);
            await populateRolesDropdown(ui.editUserForm.elements['role_id']);
            ui.editUserModal.classList.remove('hidden');
        };

        // 1. Listen for actions inside the user table (Edit & Delete)
        if (ui.userTableBody) {
            document.getElementById('user-table-body').addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                if (!userId) return;

                if (e.target.classList.contains('edit-user-button')) {
                    openUserModalForEdit(userId);
                }

                if (e.target.classList.contains('delete-user-button')) {
                    const userRow = e.target.closest('tr');
                    const username = userRow.querySelector('td').textContent;
                    if (confirm(`Apakah Anda yakin ingin menghapus pengguna "${username}"?`)) {
                        (async () => {
                            try {
                                await apiFetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' });
                                showToast(`Pengguna "${username}" berhasil dihapus.`);
                                userRow.remove(); // Langsung hapus baris dari tabel untuk update instan
                            } catch (error) {
                                showToast(error.message, 'error');
                            }
                        })();
                    }
                }
            });
        }

        // 2. Listen for "Add User" button click
        if (ui.addUserButton) {
            ui.addUserButton.addEventListener('click', openUserModalForCreate);
        }

        // 3. Listen for modal close actions
        if (ui.editUserModal) {
            const closeUserModal = () => ui.editUserModal.classList.add('hidden');
        // PERBAIKAN: Tambahkan pengecekan untuk memastikan tombol ada sebelum menambahkan listener.
        if (ui.closeEditUserModalButton) {
            ui.closeEditUserModalButton.addEventListener('click', closeUserModal);
        }
            ui.editUserModal.addEventListener('click', (e) => {
                if (e.target === ui.editUserModal) closeUserModal();
            });
        }

        // 4. Listen for form submission (Create and Update)
        if (ui.editUserForm) {
            ui.editUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(ui.editUserForm);
                // Gunakan Object.fromEntries untuk field bernilai tunggal
                const data = Object.fromEntries(formData.entries());
                const userId = data.id;

                // Untuk multi-select, kita harus menggunakan getAll() untuk mendapatkan array
                data.hotel_ids = formData.getAll('hotel_ids').map(id => parseInt(id, 10));

                if (!data.password) {
                    delete data.password;
                }

                const url = userId ? `${API_BASE_URL}/users/${userId}` : `${API_BASE_URL}/users`;
                const method = userId ? 'PUT' : 'POST';

                try {
                    const result = await apiFetch(url, {
                        method: method,
                        body: JSON.stringify(data)
                    });
                    showToast(result.message || 'Data pengguna berhasil disimpan.');
                    ui.editUserModal.classList.add('hidden');
                    loadUsers();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    };

    const setupAgendaModalListeners = () => {
        if (!ui.addEventModal) return;

        // Menggunakan ui.addEventModal karena itu yang benar, bukan #close-add-event-modal
        const closeEventModal = () => ui.addEventModal.classList.add('hidden');
        const closeButton = document.getElementById('close-event-modal-button');
        const deleteButton = document.getElementById('delete-event-button');

        // 1. Listen for modal close controls
        if (closeButton) closeButton.addEventListener('click', closeEventModal);
        ui.addEventModal.addEventListener('click', (e) => {
            if (e.target === ui.addEventModal) closeEventModal();
        });

        // 2. Listen for delete button click
        if (deleteButton) {
            deleteButton.addEventListener('click', async () => {
                const eventId = document.getElementById('event-id').value;
                if (!eventId) return;

                if (confirm('Apakah Anda yakin ingin menghapus agenda ini?')) {
                    try {
                        const result = await apiFetch(`${API_BASE_URL}/agendas/${eventId}`, { method: 'DELETE' });
                        showToast(result.message || 'Agenda berhasil dihapus.');
                        closeEventModal();
                        if (calendar) calendar.refetchEvents();
                        loadAgendasTable(); // Muat ulang tabel agenda juga
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                }
            });
        }

        // 3. Listen for form submission (to add new events)
        if (ui.addEventForm) {
            ui.addEventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(ui.addEventForm);

                // Gabungkan input tanggal dan waktu menjadi format ISO yang valid
                const startDate = formData.get('start_date');
                const startTime = formData.get('start_time');
                const endDate = formData.get('end_date') || startDate; // Gunakan tanggal mulai jika tanggal selesai kosong
                const endTime = formData.get('end_time');

                const startISO = `${startDate}T${startTime}:00`;
                const endISO = endTime ? `${endDate}T${endTime}:00` : null;

                // PERBAIKAN: Ambil status dari dropdown dan tentukan warnanya
                const status = formData.get('status');
                const STATUS_COLORS = {
                    'Terjadwal': '#3B82F6',       // Biru
                    'Sedang Proses': '#FBBF24',  // Kuning (Amber)
                    'Selesai': '#10B981',         // Hijau (Emerald)
                    'Dibatalkan': '#EF4444',      // Merah
                };
                const color = STATUS_COLORS[status] || '#3B82F6'; // Default ke biru jika status tidak dikenal

                const eventData = {
                    hotel_id: formData.get('hotel_id'),
                    start: startISO,
                    end: endISO,
                    description: formData.get('description'),
                    color: color,
                    status: status, // Kirim juga statusnya ke backend
                    audit_type_id: formData.get('audit_type_id'),
                };

                try {
                    await apiFetch(`${API_BASE_URL}/agendas`, {
                        method: 'POST',
                        body: JSON.stringify(eventData)
                    });
                    showToast('Agenda berhasil ditambahkan.');
                    closeEventModal();
                    if (calendar) calendar.refetchEvents();
                    // PERBAIKAN: Muat ulang tabel agenda juga, jika sedang ditampilkan.
                    loadAgendasTable();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    };

    /**
     * Membuka modal untuk menambah atau mengedit tipe audit.
     * @param {'add' | 'edit'} mode - Mode modal.
     * @param {object} [data={}] - Data untuk pre-fill form (id, name).
     */
    function openAuditTypeModal(mode, data = {}) {
        const modal = document.getElementById('audit-type-modal');
        const form = document.getElementById('audit-type-form');
        const title = document.getElementById('audit-type-modal-title');
        const idInput = document.getElementById('audit-type-id');
        const nameInput = document.getElementById('audit-type-name');

        form.reset();
        if (mode === 'add') {
            title.textContent = 'Tambah Tipe Audit Baru';
            idInput.value = '';
        } else if (mode === 'edit') {
            title.textContent = 'Edit Tipe Audit';
            idInput.value = data.id;
            nameInput.value = data.name;
        }
        modal.classList.remove('hidden');
    }

    /**
     * Menangani permintaan penghapusan tipe audit.
     * @param {string} id - ID tipe audit yang akan dihapus.
     * @param {string} name - Nama tipe audit untuk konfirmasi.
     */
    async function handleDeleteAuditType(id, name) {
        if (confirm(`Apakah Anda yakin ingin menghapus tipe audit "${name}"?`)) {
            try {
                await apiFetch(`${API_BASE_URL}/audit-types/${id}`, { method: 'DELETE' });
                showToast('Tipe audit berhasil dihapus.');
                loadAuditTypes(); // Muat ulang daftar setelah berhasil hapus
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    }

    /**
     * Menangani semua interaksi untuk halaman Manajemen Tipe Audit.
     * Termasuk tambah, edit, hapus, dan penutupan modal.
     */
    function setupAuditTypeManagementListeners() {
        const modal = document.getElementById('audit-type-modal');
        if (!modal) return; // Keluar jika modal tidak ada

        const form = document.getElementById('audit-type-form');

        // Menggunakan event delegation untuk menangani klik di seluruh halaman
        document.body.addEventListener('click', async (e) => {
            const target = e.target;

            const openModal = () => {
                ui.auditTypeForm.reset();
                ui.auditTypeForm.elements['id'].value = '';
                document.getElementById('audit-type-modal-title').textContent = 'Tambah Tipe Audit';
                ui.auditTypeModal.classList.remove('hidden');
            };
            const closeModal = () => ui.auditTypeModal.classList.add('hidden');

            // Tombol "Tambah Tipe Audit"
            if (target.id === 'add-audit-type-button') {
                openAuditTypeModal('add');
            }

            // Tombol "Edit" di dalam baris tabel
            if (target.classList.contains('edit-audit-type-button')) {
                const row = target.closest('tr');
                openAuditTypeModal('edit', { id: row.dataset.id, name: row.dataset.name });
            }

            // Tombol "Hapus" di dalam baris tabel
            if (target.classList.contains('delete-audit-type-button')) {
                const row = target.closest('tr');
                handleDeleteAuditType(row.dataset.id, row.dataset.name);
            }

            // Tombol tutup modal
            if (target.id === 'close-audit-type-modal-button' || target.closest('#close-audit-type-modal-button')) {
                modal.classList.add('hidden');
            }
        });

        // Listener untuk form submission (Create & Update)
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('audit-type-id').value;
                const name = document.getElementById('audit-type-name').value;
                const method = id ? 'PUT' : 'POST';
                const url = id ? `${API_BASE_URL}/audit-types/${id}` : `${API_BASE_URL}/audit-types`;

                try {
                    const result = await apiFetch(url, {
                        method: method,
                        body: JSON.stringify({ name })
                    });
                    showToast(result.message || 'Data berhasil disimpan.');
                    modal.classList.add('hidden');
                    loadAuditTypes();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    };

    const setupChecklistManagement = () => {
        if (ui.checklistAuditTypeSelector) {
            ui.checklistAuditTypeSelector.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                const selectedName = e.target.options[e.target.selectedIndex].text;
                loadChecklistsForType(selectedId, selectedName);
            });
        }

        // Audit Checklist Modal and Form Logic
        if (ui.addChecklistItemButton && ui.auditChecklistModal) {
            const openModal = () => {
                const form = ui.auditChecklistForm;
                form.reset();
                form.elements['id'].value = '';
                form.elements['audit_type_id'].value = ui.checklistAuditTypeSelector.value; // Set the current audit type
                document.getElementById('audit-checklist-modal-title').textContent = 'Tambah Item Checklist';
                ui.auditChecklistModal.classList.remove('hidden');
            };
            const closeModal = () => ui.auditChecklistModal.classList.add('hidden');

            ui.addChecklistItemButton.addEventListener('click', openModal);
            ui.closeAuditChecklistModalButton.addEventListener('click', closeModal);
            ui.auditChecklistModal.addEventListener('click', (e) => {
                if (e.target === ui.auditChecklistModal) closeModal();
            });

            // Event delegation for edit/delete checklist items
            ui.checklistTableBody.addEventListener('click', (e) => {
                const target = e.target;
                const row = target.closest('tr');
                if (!row || !row.dataset.id) return;

                // Handle Edit
                if (target.classList.contains('edit-checklist-item-button')) {
                    const form = ui.auditChecklistForm;
                    document.getElementById('audit-checklist-modal-title').textContent = 'Edit Item Checklist';
                    form.elements['id'].value = row.dataset.id;
                    form.elements['category'].value = row.dataset.category;
                    form.elements['item_text'].value = row.dataset.itemText;
                    form.elements['audit_type_id'].value = ui.checklistAuditTypeSelector.value;
                    ui.auditChecklistModal.classList.remove('hidden');
                }

                // Handle Delete
                if (target.classList.contains('delete-checklist-item-button')) {
                    const itemId = row.dataset.id;
                    const itemText = row.dataset.itemText;
                    if (confirm(`Apakah Anda yakin ingin menghapus item checklist:\n"${itemText}"?`)) {
                        (async () => {
                            try {
                                await apiFetch(`${API_BASE_URL}/audit-checklists/${itemId}`, { method: 'DELETE' });
                                const selectedId = ui.checklistAuditTypeSelector.value;
                                const selectedName = ui.checklistAuditTypeSelector.options[ui.checklistAuditTypeSelector.selectedIndex].text;
                                loadChecklistsForType(selectedId, selectedName);
                                showToast('Item checklist berhasil dihapus.');
                            } catch (error) {
                                showToast(error.message, 'error');
                            }
                        })();
                    }
                }
            });

            // Handle Form Submission (Create and Update)
            ui.auditChecklistForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(ui.auditChecklistForm);
                const data = Object.fromEntries(formData.entries());
                const itemId = data.id;

                const url = itemId ? `${API_BASE_URL}/audit-checklists/${itemId}` : `${API_BASE_URL}/audit-checklists`;
                const method = itemId ? 'PUT' : 'POST';

                const body = {
                    item_text: data.item_text,
                    category: data.category,
                    audit_type_id: data.audit_type_id
                };

                // For PUT requests, we don't need to send the audit_type_id
                if (method === 'PUT') {
                    delete body.audit_type_id;
                }

                try {
                    await apiFetch(url, {
                        method: method,
                        body: JSON.stringify(body)
                    });
                    ui.auditChecklistModal.classList.add('hidden');
                    
                    // Refresh the checklist for the currently selected audit type
                    const selectedId = ui.checklistAuditTypeSelector.value;
                    const selectedName = ui.checklistAuditTypeSelector.options[ui.checklistAuditTypeSelector.selectedIndex].text;
                    loadChecklistsForType(selectedId, selectedName);
                    showToast('Item checklist berhasil disimpan.');
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    };
    const setupRoleManagement = () => {
        const permissionsModal = document.getElementById('permissions-modal');
        if (permissionsModal) {
            const mainContent = document.querySelector('main');
            const closePermissionsModalButton = document.getElementById('close-permissions-modal-button');
            const permissionsForm = document.getElementById('permissions-form');
            const permissionsChecklist = document.getElementById('permissions-checklist');
            const permissionsModalTitle = document.getElementById('permissions-modal-title');
            const permissionsRoleIdInput = document.getElementById('permissions-role-id');

            const openPermissionsModal = async (roleId, roleName) => {
                permissionsModalTitle.textContent = `Hak Akses untuk: ${roleName}`;
                permissionsRoleIdInput.value = roleId;
                permissionsChecklist.innerHTML = '<p class="text-gray-500">Memuat hak akses...</p>';
                permissionsModal.classList.remove('hidden');
                if (typeof feather !== 'undefined') feather.replace();

                try {
                    const token = localStorage.getItem('authToken');
                    // Ambil semua permission dan permission milik role secara paralel
                    const [allPermissionsRes, rolePermissionsRes] = await Promise.all([
                        fetch(`${API_BASE_URL}/permissions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                        fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, { headers: { 'Authorization': `Bearer ${token}` } })
                    ]);

                    if (!allPermissionsRes.ok || !rolePermissionsRes.ok) {
                        throw new Error('Gagal memuat data hak akses.');
                    }

                    const allPermissions = await allPermissionsRes.json();
                    const rolePermissionIds = await rolePermissionsRes.json(); // Ini adalah array berisi ID

                    // Tampilkan checklist
                    permissionsChecklist.innerHTML = '';
                    allPermissions.forEach(permission => {
                        const isChecked = rolePermissionIds.includes(permission.id);
                        const label = document.createElement('label');
                        label.className = 'flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer';
                        label.innerHTML = `
                            <input type="checkbox" name="permission" value="${permission.id}" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${isChecked ? 'checked' : ''}>
                            <span class="ml-3 text-sm text-gray-700">${permission.description || permission.name}</span>
                        `;
                        permissionsChecklist.appendChild(label);
                    });

                } catch (error) {
                    permissionsChecklist.innerHTML = `<p class="text-red-500">${error.message}</p>`;
                }
            };

            const closePermissionsModal = () => permissionsModal.classList.add('hidden');

            // Listener untuk tombol "Kelola Hak Akses"
            mainContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('manage-permissions-button')) {
                    const roleId = e.target.dataset.roleId;
                    const roleName = e.target.dataset.roleName;
                    openPermissionsModal(roleId, roleName);
                }
            });

            // Listener untuk menutup modal
            closePermissionsModalButton.addEventListener('click', closePermissionsModal);
            permissionsModal.addEventListener('click', (e) => {
                if (e.target === permissionsModal) closePermissionsModal();
            });

            // Listener untuk submit form
            permissionsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const roleId = permissionsRoleIdInput.value;
                const checkedBoxes = permissionsForm.querySelectorAll('input[name="permission"]:checked');
                const permissionIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

                try {
                    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                        body: JSON.stringify({ permissionIds })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    closePermissionsModal();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });
        }
    };

    const setupHotelManagement = () => {
        if (!ui.addHotelButton || !ui.hotelModal || !document.getElementById('hotel-table-body')) return;

        // Helper function to open the hotel modal
        const openHotelModal = (mode, hotelData = {}) => {
            if (!ui.hotelModal) return;
            ui.hotelForm.reset();
            const title = document.getElementById('hotel-modal-title');
            const idInput = document.getElementById('hotel-id');

            if (mode === 'edit' && hotelData.id) {
                title.textContent = 'Edit Data Hotel';
                idInput.value = hotelData.id;
                ui.hotelForm.elements['name'].value = hotelData.name;
                ui.hotelForm.elements['address'].value = hotelData.address;
            } else {
                title.textContent = 'Tambah Hotel Baru';
                idInput.value = '';
            }
            ui.hotelModal.classList.remove('hidden');
            if (typeof feather !== 'undefined') feather.replace();
        };

        // Helper function to close the hotel modal
        const closeHotelModal = () => {
            if (ui.hotelModal) ui.hotelModal.classList.add('hidden');
        };

        // 1. Listen for clicks inside the Hotel Table (for Edit and Delete)
        const hotelTableBody = document.getElementById('hotel-table-body');
        if (hotelTableBody) {
            hotelTableBody.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                if (!row || !row.dataset.id) return;

                // Handle EDIT button
                if (e.target.classList.contains('edit-hotel-button')) {
                    openHotelModal('edit', row.dataset);
                }

                // Handle DELETE button
                if (e.target.classList.contains('delete-hotel-button')) {
                    const { id, name } = row.dataset;
                    if (confirm(`Apakah Anda yakin ingin menghapus hotel "${name}"?`)) {
                        (async () => {
                            try {
                                await apiFetch(`${API_BASE_URL}/hotels/${id}`, { method: 'DELETE' });
                                showToast(`Hotel "${name}" berhasil dihapus.`);
                                loadHotels();
                            } catch (error) {
                                showToast(error.message, 'error');
                            }
                        })();
                    }
                }
            });
        }

        // 2. Listen for clicks on modal controls
        if (ui.addHotelButton) ui.addHotelButton.addEventListener('click', () => openHotelModal('add'));
        if (ui.closeHotelModalButton) ui.closeHotelModalButton.addEventListener('click', closeHotelModal);
        if (ui.hotelModal) ui.hotelModal.addEventListener('click', (e) => {
            if (e.target === ui.hotelModal) closeHotelModal();
        });

        // 3. Listen for the form submission (for both Add and Edit)
        if (ui.hotelForm) {
            ui.hotelForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(ui.hotelForm);
                const id = formData.get('hotel-id');
                const data = { name: formData.get('name'), address: formData.get('address') };
                const url = id ? `${API_BASE_URL}/hotels/${id}` : `${API_BASE_URL}/hotels`;
                const method = id ? 'PUT' : 'POST';

                try {
                    const result = await apiFetch(url, {
                        method,
                        body: JSON.stringify(data)
                    });
                    showToast(result.message || 'Data hotel berhasil disimpan.');
                    closeHotelModal();
                    loadHotels();
                } catch (error) { showToast(error.message, 'error'); }
            });
        }
    };

    /**
     * Menangani interaksi di halaman Daftar Agenda, seperti tombol "Tambah" dan "Lihat di Kalender".
     */
    const setupAgendaViewListeners = () => {
        const mainContent = document.querySelector('main');
        if (!mainContent) return;

        mainContent.addEventListener('click', (e) => {
            // Tombol "Tambah Agenda" dari halaman tabel
            // PERBAIKAN: Gunakan .closest() agar klik pada ikon atau teks di dalam tombol tetap berfungsi.
            if (e.target.closest('#add-agenda-from-table-button')) {
                openAgendaModal('add', {}); // Panggil modal langsung
            }

            // Tombol "Lihat di Kalender" di setiap baris tabel
            if (e.target.classList.contains('view-in-calendar-button')) {
                navigateTo('calendar');
            }
        });
    };

    /**
     * Memuat dan merender foto untuk sebuah item checklist.
     * @param {string|number} resultId ID dari hasil audit.
     * @param {HTMLElement} galleryElement Elemen div untuk menampung galeri.
     */
    async function loadAndRenderPhotos(resultId, galleryElement) {
        if (!resultId || !galleryElement) return;
        galleryElement.innerHTML = `<div class="col-span-full text-xs text-gray-400">Memuat foto...</div>`;
        try {
            const photos = await apiFetch(`${API_BASE_URL}/audit-results/${resultId}/photos`);
            galleryElement.innerHTML = ''; // Hapus teks "memuat"
            if (photos.length === 0) {
                galleryElement.innerHTML = `<div class="col-span-full text-xs text-gray-400 italic">Belum ada foto.</div>`;
            } else {
                photos.forEach(photo => {
                    const photoEl = document.createElement('div');
                    photoEl.className = 'relative group';
                    // URL gambar dibangun dari base URL backend + path file dari database
                    const imageUrl = `${API_BASE_URL.replace('/api', '')}/${photo.file_path}`;
                    photoEl.innerHTML = `
                        <img src="${imageUrl}" alt="${photo.description || 'Audit Photo'}" class="w-full h-24 object-cover rounded-md border">
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-md">
                            <button data-photo-id="${photo.id}" class="delete-photo-btn opacity-0 group-hover:opacity-100 text-white bg-red-600 hover:bg-red-700 rounded-full p-1.5 transition-opacity duration-300">
                                <i data-feather="trash-2" class="w-4 h-4 pointer-events-none"></i>
                            </button>
                        </div>
                    `;
                    galleryElement.appendChild(photoEl);
                });
                if (typeof feather !== 'undefined') feather.replace();
            }
        } catch (error) {
            galleryElement.innerHTML = `<div class="col-span-full text-xs text-red-500">Gagal memuat foto.</div>`;
            console.error(`Gagal memuat foto untuk result ${resultId}:`, error);
        }
    }

    /**
     * Fetches and displays the checklist for a specific audit type in a modal.
     * @param {string} auditTypeId The ID of the audit type.
     * @param {string} auditTypeName The name of the audit type for the modal title.
     */
    async function showAgendaChecklist(agendaId, auditTypeId, auditTypeName, currentStatus) {
        const modal = ui.checklistViewModal;
        const container = ui.checklistViewContainer;
        const title = ui.checklistViewModalTitle;
        const saveButton = ui.saveChecklistResultsButton;
        const startButton = ui.startAuditButton;
        const finishButton = ui.finishAuditButton;
        const isReadOnly = currentStatus === 'Selesai';
        const form = document.getElementById('checklist-results-form');

        if (!modal || !container || !title || !saveButton || !startButton || !finishButton || !form) return;

        // Simpan agendaId di form untuk digunakan saat submit
        form.dataset.agendaId = agendaId;
        form.dataset.currentStatus = currentStatus; // PERBAIKAN: Simpan status saat ini ke form
        startButton.dataset.agendaId = agendaId;
        finishButton.dataset.agendaId = agendaId;
        
        title.textContent = `Checklist untuk: ${auditTypeName}`;
        container.innerHTML = '<p class="text-gray-500">Memuat checklist...</p>';
        modal.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();

        // Sembunyikan semua tombol proses audit secara default
        startButton.style.display = 'none';
        finishButton.style.display = 'none';
        saveButton.style.display = 'none';


        try {
            let checklists;
            if (isReadOnly) {
                // Untuk laporan yang sudah selesai, ambil hasil yang tersimpan.
                checklists = await apiFetch(`${API_BASE_URL}/agendas/${agendaId}/results`);
            } else {
                // Untuk audit baru atau sedang berjalan, ambil hasil yang sudah ada atau master checklist.
                checklists = await apiFetch(`${API_BASE_URL}/agendas/${agendaId}/results`);
            }
            if (checklists.length === 0) {
                container.innerHTML = '<p class="text-gray-500">Tidak ada item checklist untuk tipe audit ini.</p>';
                return;
            }

            // Tampilkan tombol berdasarkan status
            if (currentStatus === 'Terjadwal') {
                startButton.style.display = 'inline-flex';
            } else if (currentStatus === 'Sedang Proses') {
                finishButton.style.display = 'inline-flex';
            }

            // Group by category
            const groupedByCategory = checklists.reduce((acc, item) => {
                const category = item.category || 'Lain-lain';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(item);
                return acc;
            }, {});

            const fragment = document.createDocumentFragment();

            // Tambahkan tombol kembali jika ini adalah tampilan laporan (read-only)
            if (isReadOnly) {
                const buttonContainer = document.createElement('div');
                // PERBAIKAN: Mengubah layout ke justify-end karena tombol kembali dihapus.
                buttonContainer.className = 'flex justify-end items-center mb-6';

                const printButton = document.createElement('button');
                printButton.className = 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500';
                printButton.type = 'button'; // PERBAIKAN: Mencegah tombol ini men-submit form
                printButton.innerHTML = `<i data-feather="printer" class="w-4 h-4 mr-2"></i> Cetak PDF`;
                printButton.addEventListener('click', () => printAuditReport(agendaId));
                buttonContainer.appendChild(printButton);

                fragment.appendChild(buttonContainer);
            }

            for (const category in groupedByCategory) {
                const categoryTitle = document.createElement('h4');
                categoryTitle.className = 'text-md font-semibold text-gray-800 mt-4 mb-2 border-b pb-1';
                categoryTitle.textContent = category;
                fragment.appendChild(categoryTitle);

                const ul = document.createElement('ul');
                ul.className = 'space-y-4'; // Beri jarak lebih antar item
                groupedByCategory[category].forEach(item => {
                    const li = document.createElement('li');
                    li.dataset.checklistItemId = item.id;
                    li.className = 'p-2 rounded-md hover:bg-gray-50';

                    // Ambil data yang sudah tersimpan (jika ada)
                    const isChecked = item.is_checked === true;
                    const comment = item.comment || '';

                    // Logika baru untuk menampilkan bagian foto
                    const resultId = item.result_id; // Asumsi backend mengirimkan 'result_id'
                    let photoSectionHtml = '';

                    if (resultId) {
                        // Jika item sudah disimpan (memiliki resultId), selalu tampilkan galeri.
                        const uploaderHtml = !isReadOnly ? `
                            <div class="photo-uploader">
                                <div class="photo-preview-container mb-2"></div>
                                <label for="photo-upload-${item.id}" class="add-photo-label inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                    <i data-feather="camera" class="w-4 h-4 mr-2"></i>
                                    Tambah Foto
                                </label>
                                <input type="file" id="photo-upload-${item.id}" class="hidden photo-upload-input" accept="image/*" data-result-id="${resultId || ''}">
                            </div>
                        ` : ''; // Jangan tampilkan uploader jika read-only

                        photoSectionHtml = `
                            <div class="photo-section mt-3 pl-7">
                                <div class="photo-gallery mb-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" id="gallery-for-${resultId}" data-result-id="${resultId}"></div>
                                ${uploaderHtml}
                            </div>
                        `;
                    } else if (!isReadOnly) {
                        // Jika belum disimpan dan dalam mode edit, tampilkan pesan.
                        photoSectionHtml = `<div class="mt-2 ml-7 text-xs text-gray-400 italic">Simpan hasil checklist terlebih dahulu untuk mengunggah foto.</div>`;
                    }

                    li.innerHTML = `
                        <div class="flex items-start">
                            <input type="checkbox" id="view-check-${item.id}" class="checklist-checkbox h-4 w-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" ${isChecked ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''}>
                            <label for="view-check-${item.id}" class="ml-3 text-sm text-gray-700 cursor-pointer">${item.item_text}</label>
                        </div>
                        <textarea class="checklist-comment w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-2 ml-7" rows="2" placeholder="Tambahkan komentar..." ${isReadOnly ? 'disabled' : ''}>${comment}</textarea>
                        ${photoSectionHtml}
                    `;
                    ul.appendChild(li);
                });
                fragment.appendChild(ul);
            }
            
            container.innerHTML = '';
            container.appendChild(fragment);

            // Setelah struktur utama dirender, muat foto untuk setiap item yang relevan
            document.querySelectorAll('.photo-gallery[data-result-id]').forEach(gallery => {
                loadAndRenderPhotos(gallery.dataset.resultId, gallery);
            });

            // Panggil feather untuk merender ikon baru (seperti ikon panah kembali)
            if (typeof feather !== 'undefined') feather.replace();

        } catch (error) {
            container.innerHTML = `<p class="text-red-500">Gagal memuat checklist: ${error.message}</p>`;
        }
    }

    const recalculateAndRenderTotals = () => {
        const tableFoot = document.getElementById('income-audit-table-foot');
        if (!tableFoot) return;

        if (!currentIncomeAuditData || currentIncomeAuditData.length === 0) {
            tableFoot.innerHTML = '';
            return;
        }

        const headers = ['DATE', 'Room Available', 'Room OOO', 'Room Com & HU', 'Room Sold', 'Number of Guest', '%Occp', 'ARR', 'RevPAR', 'Lodging Revenue', 'Others Room Revenue', 'Room Revenue', 'Breakfast Revenue', 'Restaurant Revenue', 'Room Service', 'Banquet Revenue', 'F&B Others', 'F&B Revenue', 'Others Revenue', 'Total Revenue', 'Service', 'Tax', 'Gross Revenue', 'Shared Payable', 'Deposit Reservation', 'Cash FO', 'Cash Outlet', 'Bank Transfer', 'QRIS', 'Credit/Debit Card', 'City Ledger', 'Total Settlement', 'GAB', 'BALANCE'];
        const columnsToSum = [
            'Room Available', 'Room OOO', 'Room Com & HU', 'Room Sold', 'Number of Guest', 
            'Lodging Revenue', 'Others Room Revenue', 'Room Revenue', 'Breakfast Revenue', 
            'Restaurant Revenue', 'Room Service', 'Banquet Revenue', 'F&B Others', 
            'F&B Revenue', 'Others Revenue', 'Total Revenue', 'Service', 'Tax', 
            'Gross Revenue', 'Shared Payable', 'Deposit Reservation', 'Cash FO', 
            'Cash Outlet', 'Bank Transfer', 'QRIS', 'Credit/Debit Card', 'City Ledger', 
            'Total Settlement', 'GAB', 'BALANCE'
        ];        
        const totals = {};
        columnsToSum.forEach(col => totals[col] = 0);

        currentIncomeAuditData.forEach(row => {
            columnsToSum.forEach(colName => {
                const rowKey = Object.keys(row).find(k => k.toLowerCase().trim() === colName.toLowerCase().trim());
                const value = rowKey ? parseFloat(row[rowKey]) : 0;
                if (!isNaN(value)) {
                    totals[colName] += value;
                }
            });
        });

        // Hitung rata-rata okupansi berdasarkan total
        const totalRoomSold = totals['Room Sold'];
        const totalRoomAvailable = totals['Room Available'];
        const averageOccp = (totalRoomAvailable > 0) ? (totalRoomSold / totalRoomAvailable) * 100 : 0;

        const integerColumns = ['Room Available', 'Room OOO', 'Room Com & HU', 'Room Sold', 'Number of Guest'];
        let footerHtml = '<tr>';
        footerHtml += `<td class="px-4 py-3 text-left text-sm font-semibold text-gray-800">Total</td>`;

        for (let i = 1; i < headers.length; i++) {
            const header = headers[i];
            const alignmentClass = numericColumnsRightAlign.has(header) ? 'text-right' : '';
            let totalValue = '';
            if (header === '%Occp') {
                totalValue = averageOccp.toFixed(2) + '%';
            } else if (columnsToSum.includes(header)) {
                const isInt = integerColumns.includes(header);
                const options = isInt ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                totalValue = (totals[header] || 0).toLocaleString('id-ID', options);
            }
            footerHtml += `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-800 ${alignmentClass}">${totalValue}</td>`;
        }
        footerHtml += '</tr>';
        tableFoot.innerHTML = footerHtml;
    };

    const renderIncomeAuditData = (data) => {
        currentIncomeAuditData = data || []; // Simpan data untuk diunduh
        const tableBody = document.getElementById('income-audit-table-body');
        const tableFoot = document.getElementById('income-audit-table-foot');
        const downloadButton = document.getElementById('download-excel-button');
        const submitButton = document.getElementById('submit-income-audit-button');

        if (submitButton) {
            submitButton.disabled = currentIncomeAuditData.length === 0;
        }

        if (!tableBody || !tableFoot) return;

        const headers = ['DATE', 'Room Available', 'Room OOO', 'Room Com & HU', 'Room Sold', 'Number of Guest', '%Occp', 'ARR', 'RevPAR', 'Lodging Revenue', 'Others Room Revenue', 'Room Revenue', 'Breakfast Revenue', 'Restaurant Revenue', 'Room Service', 'Banquet Revenue', 'F&B Others', 'F&B Revenue', 'Others Revenue', 'Total Revenue', 'Service', 'Tax', 'Gross Revenue', 'Shared Payable', 'Deposit Reservation', 'Cash FO', 'Cash Outlet', 'Bank Transfer', 'QRIS', 'Credit/Debit Card', 'City Ledger', 'Total Settlement', 'GAB', 'BALANCE'];
        const columnsToSum = [
            'Room Available', 'Room OOO', 'Room Com & HU', 'Room Sold', 'Number of Guest', 
            'Lodging Revenue', 'Others Room Revenue', 'Room Revenue', 'Breakfast Revenue', 
            'Restaurant Revenue', 'Room Service', 'Banquet Revenue', 'F&B Others', 
            'F&B Revenue', 'Others Revenue', 'Total Revenue', 'Service', 'Tax', 
            'Gross Revenue', 'Shared Payable', 'Deposit Reservation', 'Cash FO', 
            'Cash Outlet', 'Bank Transfer', 'QRIS', 'Credit/Debit Card', 'City Ledger', 
            'Total Settlement', 'GAB', 'BALANCE'
        ];
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${headers.length}" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-feather="alert-circle" class="w-12 h-12 text-gray-400 mb-4"></i>
                            <span class="font-medium">Tidak ada data untuk ditampilkan.</span>
                            <span class="text-sm">File Excel mungkin kosong atau formatnya tidak sesuai.</span>
                        </div>
                    </td>
                </tr>`;
            recalculateAndRenderTotals(); // Kosongkan footer juga
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        tableBody.innerHTML = data.map((row, rowIndex) => `
            <tr data-row-index="${rowIndex}">
                ${headers.map(header => {
                    const rowKey = Object.keys(row).find(k => k.toLowerCase().trim() === header.toLowerCase().trim());
                    let value = rowKey ? row[rowKey] : 'N/A';
                    let isEditable = columnsToSum.includes(header);

                    // Override value for calculated fields
                    if (header === '%Occp') {
                        const roomSoldKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'room sold');
                        const roomAvailableKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'room available');
                        const roomSold = roomSoldKey ? parseFloat(row[roomSoldKey]) : 0;
                        const roomAvailable = roomAvailableKey ? parseFloat(row[roomAvailableKey]) : 0;
                        
                        value = (roomAvailable > 0 && !isNaN(roomSold)) 
                            ? ((roomSold / roomAvailable) * 100).toFixed(2) + '%' 
                            : '0.00%';
                        isEditable = false; // Calculated fields are not editable
                    }

                    if (header === 'DATE' && value instanceof Date) {
                        value = value.toLocaleDateString('id-ID');
                    } else if (typeof value === 'number') {
                        value = value.toLocaleString('id-ID');
                    }

                    const editableAttrs = isEditable ? `contenteditable="true" data-column-header="${header}"` : '';
                    const editableClass = isEditable ? 'editable-cell bg-yellow-50 hover:bg-yellow-100 focus:bg-white focus:outline-indigo-500 cursor-text' : '';
                    const alignmentClass = numericColumnsRightAlign.has(header) ? 'text-right' : '';

                    return `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 ${editableClass} ${alignmentClass}" ${editableAttrs}>${value}</td>`;
                }).join('')}
            </tr>
        `).join('');

        recalculateAndRenderTotals();
    };

    const setupSubmitIncomeAuditPage = () => {
        const fileInput = document.getElementById('excel-upload');
        const fileInputLabel = document.getElementById('excel-upload-label'); // Corrected from querySelector
        const fileNameDisplay = document.getElementById('excel-file-name');
        const downloadButton = document.getElementById('download-excel-button');
        const submitButton = document.getElementById('submit-income-audit-button');
        const hotelSelector = document.getElementById('income-audit-hotel-selector');
        
        // FIX: Remove dateSelector from the check as it no longer exists.
        // This was the primary cause of the function failing to run.
        if (!fileInput || !fileNameDisplay || !downloadButton || !hotelSelector || !fileInputLabel || !submitButton) return;

        const checkInputsAndToggleUpload = () => {
            const hotelSelected = !!hotelSelector.value;
            // FIX: The ability to upload now only depends on selecting a hotel.
            const canUpload = hotelSelected; 

            fileInput.disabled = !canUpload;
            if (canUpload) {
                fileInputLabel.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                fileInputLabel.classList.add('opacity-50', 'cursor-not-allowed');
                fileInput.value = '';
                // FIX: Update the message to reflect that only the hotel is needed.
                fileNameDisplay.textContent = 'Pilih hotel terlebih dahulu';
                renderIncomeAuditData([]);
            }
        };

        // Initially disable file interactions
        fileInput.disabled = true;
        fileInputLabel.classList.add('opacity-50', 'cursor-not-allowed');

        // Use a flag to prevent adding listeners multiple times
        if (hotelSelector.dataset.listenerAttached === 'true') return;
        hotelSelector.dataset.listenerAttached = 'true';

        // Add listener to hotel selector to enable/disable file input
        hotelSelector.addEventListener('change', checkInputsAndToggleUpload);
        
        fileInput.addEventListener('change', e => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                fileNameDisplay.textContent = file.name;
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, {type: 'array', cellDates: true});
                        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        
                        renderIncomeAuditData(json);
                        showToast('File Excel berhasil diproses dan ditampilkan.', 'success');

                    } catch (error) {
                        console.error('Gagal memproses file Excel:', error);
                        showToast(`Gagal memproses file: ${error.message}`, 'error');
                        renderIncomeAuditData([]);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });

        // Tambahkan listener untuk tombol simpan ke database
        submitButton.addEventListener('click', async () => {
            const hotelId = hotelSelector.value;

            // FIX: Logic no longer depends on reportDate from UI
            if (!hotelId) {
                showToast('Silakan pilih hotel terlebih dahulu.', 'error');
                return;
            }

            if (currentIncomeAuditData.length === 0) {
                showToast('Tidak ada data untuk dikirim. Silakan unggah file Excel.', 'error');
                return;
            }

            if (!confirm(`Anda akan mengirimkan ${currentIncomeAuditData.length} baris data untuk hotel yang dipilih. Lanjutkan?`)) {
                return;
            }

            // Helper to convert a JS Date to a 'YYYY-MM-DD' string, ignoring timezone.
            // This is the core fix to prevent timezone shifts.
            const toYYYYMMDD = (date) => {
                if (!(date instanceof Date) || isNaN(date)) return null;
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const firstReportKeys = currentIncomeAuditData.length > 0 ? Object.keys(currentIncomeAuditData[0]) : [];
            const dateKey = firstReportKeys.find(key => key.toLowerCase() === 'date');

            if (!dateKey) {
                showToast('Kolom "DATE" tidak ditemukan dalam data Excel.', 'error');
                return;
            }

            // Create a new array with dates correctly formatted as 'YYYY-MM-DD' strings.
            const reportsToSubmit = currentIncomeAuditData.map(originalReport => {
                const newReport = { ...originalReport };
                const originalDateObject = originalReport[dateKey];
                newReport[dateKey] = toYYYYMMDD(originalDateObject);
                return newReport;
            });

            try {
                const result = await apiFetch(`${API_BASE_URL}/income-audit-reports/bulk`, {
                    method: 'POST',
                    body: JSON.stringify({
                        hotel_id: hotelId,
                        reports: reportsToSubmit // Send the timezone-safe data
                    })
                });

                showToast(result.message || 'Data berhasil dikirim ke server.', 'success');
                renderIncomeAuditData([]); // Clear table and disable button after success
            } catch (error) {
                showToast(`Gagal mengirim data: ${error.message}`, 'error');
            }
        });
    };

    const setupIncomeAuditTableEditing = () => {
        const tableBody = document.getElementById('income-audit-table-body');
        if (!tableBody) return;

        tableBody.addEventListener('blur', (e) => {
            const cell = e.target;
            if (cell.tagName === 'TD' && cell.isContentEditable) {
                const rowIndex = parseInt(cell.parentElement.dataset.rowIndex, 10);
                const columnHeader = cell.dataset.columnHeader;
                const rawValue = cell.textContent.trim();

                // 1. Sanitize and parse the new value
                // Mengubah format "1.234,56" menjadi "1234.56"
                const numericValue = parseFloat(rawValue.replace(/\./g, '').replace(/,/g, '.'));
                
                const dataRow = currentIncomeAuditData[rowIndex];
                const dataKey = Object.keys(dataRow).find(k => k.toLowerCase().trim() === columnHeader.toLowerCase().trim());
                const originalValue = dataKey ? dataRow[dataKey] : 0;

                if (isNaN(numericValue)) {
                    // Revert to old value if input is invalid
                    cell.textContent = originalValue.toLocaleString('id-ID');
                    showToast('Input tidak valid. Hanya angka yang diperbolehkan.', 'error');
                    return;
                }

                if (dataKey) {
                    // 2. Update the data in our state array
                    dataRow[dataKey] = numericValue;

                    // 3. Re-format the cell content for consistency
                    cell.textContent = numericValue.toLocaleString('id-ID');

                    // 4. Recalculate and re-render the footer totals
                    recalculateAndRenderTotals();
                }
            }
        }, true); // Use capture phase to handle blur correctly on table cells
    };

    const setupDeleteIncomeAuditListeners = () => {
        if (!ui.deleteIncomeAuditButton) return;

        ui.deleteIncomeAuditButton.addEventListener('click', async () => {
            const hotelId = ui.deleteIncomeAuditHotelSelector.value;
            const startDate = ui.deleteIncomeAuditStartDate.value;
            const endDate = ui.deleteIncomeAuditEndDate.value;

            if (!hotelId || !startDate || !endDate) {
                showToast('Silakan pilih hotel dan rentang tanggal laporan yang akan dihapus.', 'error');
                return;
            }

            const hotelName = ui.deleteIncomeAuditHotelSelector.options[ui.deleteIncomeAuditHotelSelector.selectedIndex].text;
            const formattedStartDate = new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const formattedEndDate = new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            if (!confirm(`APAKAH ANDA YAKIN?\n\nAnda akan menghapus SEMUA data laporan Income Audit untuk:\n\nHotel: ${hotelName}\nPeriode: ${formattedStartDate} - ${formattedEndDate}\n\nTindakan ini tidak dapat dibatalkan.`)) {
                return;
            }

            try {
                const params = new URLSearchParams({
                    hotel_id: hotelId,
                    start_date: startDate,
                    end_date: endDate
                });
                const url = `${API_BASE_URL}/income-audit-reports?${params.toString()}`;
                
                const result = await apiFetch(url, { method: 'DELETE' });

                showToast(result.message || 'Laporan berhasil dihapus.', 'success');
                // Reset form hapus
                ui.deleteIncomeAuditHotelSelector.value = '';
                ui.deleteIncomeAuditStartDate.value = '';
                ui.deleteIncomeAuditEndDate.value = '';
            } catch (error) {
                showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
            }
        });
    };

    const setupReportPageListeners = () => {
        const mainContent = document.querySelector('main');
        if (!mainContent) return;

        mainContent.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-report-details-button')) {
                const button = e.target;
                const { agendaId, auditTypeId, auditTypeName } = button.dataset;
                if (agendaId && auditTypeId && auditTypeName) {
                    // Laporan hanya untuk audit yang 'Selesai'
                    showAgendaChecklist(agendaId, auditTypeId, auditTypeName, 'Selesai');
                } else {
                    showToast('Tidak ada detail checklist untuk laporan ini.', 'error');
                }
            }
        });
    };

    /**
     * Sets up event listeners for the checklist view modal.
     */
    function setupChecklistViewModalListeners() {
        const container = ui.checklistViewContainer;
        if (!container) return;

        // Event delegation untuk unggah dan hapus foto
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('photo-upload-input')) {
                const input = e.target;
                const resultId = input.dataset.resultId;

                // PERBAIKAN: Cek apakah item sudah disimpan (memiliki resultId) SEBELUM memproses file.
                if (!resultId) {
                    showToast('Harap simpan progres checklist terlebih dahulu untuk mengaktifkan unggahan foto.', 'error');
                    input.value = ''; // Hapus file yang dipilih dari input
                    return; // Hentikan eksekusi
                }

                const file = input.files[0];
                const uploaderDiv = input.closest('.photo-uploader');
                const previewContainer = uploaderDiv.querySelector('.photo-preview-container');
                const addPhotoLabel = uploaderDiv.querySelector('.add-photo-label');

                if (!file || !resultId || !previewContainer || !addPhotoLabel) return;

                const previewUrl = URL.createObjectURL(file);

                previewContainer.innerHTML = `
                    <div class="border p-2 rounded-md bg-gray-50 inline-block">
                        <img src="${previewUrl}" alt="Pratinjau" class="max-h-32 w-auto rounded-md mb-2">
                        <div class="flex justify-end space-x-2">
                            <button type="button" class="cancel-preview-btn text-xs px-2 py-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100">Batal</button>
                            <button type="button" class="upload-preview-btn text-xs px-2 py-1 rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Unggah</button>
                        </div>
                    </div>
                `;

                addPhotoLabel.classList.add('hidden');

                const cleanup = () => {
                    URL.revokeObjectURL(previewUrl);
                    previewContainer.innerHTML = '';
                    addPhotoLabel.classList.remove('hidden');
                    input.value = '';
                };

                previewContainer.querySelector('.upload-preview-btn').onclick = async () => {
                    const uploadButton = previewContainer.querySelector('.upload-preview-btn');
                    uploadButton.disabled = true;
                    uploadButton.textContent = 'Mengunggah...';

                    const formData = new FormData();
                    formData.append('photo', file);
                    const gallery = document.getElementById(`gallery-for-${resultId}`);

                    try {
                        await apiUpload(`${API_BASE_URL}/audit-results/${resultId}/photos`, formData);
                        showToast('Foto berhasil diunggah.', 'success');
                        await loadAndRenderPhotos(resultId, gallery);
                    } catch (error) {
                        showToast(`Gagal mengunggah foto: ${error.message}`, 'error');
                    } finally {
                        cleanup();
                    }
                };

                previewContainer.querySelector('.cancel-preview-btn').onclick = cleanup;
            }
        });

        container.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-photo-btn');
            if (deleteBtn) {
                const photoId = deleteBtn.dataset.photoId;
                if (!photoId) return;

                if (confirm('Apakah Anda yakin ingin menghapus foto ini?')) {
                    try {
                        await apiFetch(`${API_BASE_URL}/photos/${photoId}`, { method: 'DELETE' });
                        showToast('Foto berhasil dihapus.', 'success');
                        deleteBtn.closest('.relative.group').remove();
                    } catch (error) {
                        showToast(`Gagal menghapus foto: ${error.message}`, 'error');
                    }
                }
            }
        });

        const form = document.getElementById('checklist-results-form');

        if (ui.closeChecklistViewModalButton) {
            ui.closeChecklistViewModalButton.addEventListener('click', () => ui.checklistViewModal.classList.add('hidden'));
        }
        if (ui.checklistViewModal) {
            ui.checklistViewModal.addEventListener('click', (e) => {
                if (e.target === ui.checklistViewModal) ui.checklistViewModal.classList.add('hidden');
            });
        }

        if (ui.startAuditButton) {
            ui.startAuditButton.addEventListener('click', (e) => {
                const agendaId = e.currentTarget.dataset.agendaId;
                if (confirm('Apakah Anda yakin ingin memulai proses audit untuk agenda ini?')) {
                    updateAgendaStatus(agendaId, 'Sedang Proses');
                }
            });
        }

        if (ui.finishAuditButton) {
            ui.finishAuditButton.addEventListener('click', async (e) => {
                const agendaId = e.currentTarget.dataset.agendaId;
                if (confirm('Apakah Anda yakin ingin menyelesaikan audit ini? Semua perubahan akan disimpan secara otomatis.')) {
                    try {
                        // Memicu event 'submit' pada form. Ini akan melempar error jika gagal.
                        await form.requestSubmit(); 
                        // Baris ini hanya akan berjalan jika requestSubmit() berhasil.
                        updateAgendaStatus(agendaId, 'Selesai');
                    } catch (error) {
                        // Toast error sudah ditampilkan oleh handler 'submit', jadi kita hanya perlu
                        // mencegah pembaruan status.
                        console.error("Penyimpanan gagal, proses penyelesaian audit dibatalkan.", error);
                    }
                }
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const agendaId = form.dataset.agendaId; // Ambil dari form

                if (!agendaId) {
                    showToast('ID Agenda tidak ditemukan. Tidak dapat menyimpan.', 'error');
                    return;
                }

                const results = [];
                const checklistItems = ui.checklistViewContainer.querySelectorAll('li[data-checklist-item-id]');
                
                checklistItems.forEach(item => {
                    const checklistItemId = item.dataset.checklistItemId;
                    const checkbox = item.querySelector('.checklist-checkbox');
                    const commentTextarea = item.querySelector('.checklist-comment');

                    results.push({
                        checklist_item_id: parseInt(checklistItemId, 10),
                        is_checked: checkbox.checked,
                        comment: commentTextarea.value.trim()
                    });
                });

                try {
                    await apiFetch(`${API_BASE_URL}/agendas/${agendaId}/results`, {
                        method: 'POST',
                        body: JSON.stringify({ results })
                    });
                    showToast('Hasil audit berhasil disimpan.');
                    
                    // MUAT ULANG TAMPILAN untuk menampilkan area unggah foto
                    const { auditTypeId, auditTypeName } = ui.checklistAgendaButton.dataset;
                    const status = form.dataset.currentStatus; // PERBAIKAN: Ambil status dari sumber yang benar
                    await showAgendaChecklist(agendaId, auditTypeId, auditTypeName, status);

                } catch (error) {
                    // Melempar error kembali agar bisa ditangkap oleh pemanggil (seperti tombol "Selesaikan Audit")
                    throw new Error(`Gagal menyimpan: ${error.message}`);
                }
            });
        }
    }

    const setupCoreListeners = () => {
        // Buat backdrop untuk overlay di layar kecil saat sidebar terbuka
        const backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop';
        // z-10 agar di bawah sidebar (z-20), dan md:hidden agar hanya muncul di mobile
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-10 hidden md:hidden';
        document.body.appendChild(backdrop);

        // Mobile menu toggle
        if (ui.menuButton && ui.sidebar) {
            ui.menuButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Mencegah event sampai ke window
                ui.sidebar.classList.toggle('-translate-x-full');
                backdrop.classList.toggle('hidden');
            });
        }

        // Fungsi untuk menutup sidebar di layar mobile
        const closeMobileSidebar = () => {
            if (ui.sidebar) ui.sidebar.classList.add('-translate-x-full');
            backdrop.classList.add('hidden');
        };

        // Tutup sidebar saat backdrop diklik
        backdrop.addEventListener('click', closeMobileSidebar);

        // Navigation for all sidebar links and cards
        ui.navTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = trigger.dataset.target;
                const filterStatus = trigger.dataset.filterStatus; // Ambil status filter

                // Penanganan khusus untuk navigasi dengan filter ke halaman agenda
                if (targetId === 'agenda' && filterStatus) {
                    showContent(targetId);
                    updateActiveSidebarLink(targetId, trigger);
                    updatePageTitle(targetId, trigger);
                    // Panggil loader agenda secara langsung dengan filter
                    loadAgendasTable({ status: filterStatus });
                } else {
                    // Gunakan alur navigasi standar untuk semua halaman lain
                    if (targetId) navigateTo(targetId, trigger);
                }

                // Close sidebar on mobile after navigation
                if (window.innerWidth < 768 && ui.sidebar && ui.sidebar.contains(trigger)) {
                    closeMobileSidebar();
                }
            });
        });

        // Listener untuk tombol checklist di dalam modal agenda
        document.body.addEventListener('click', (e) => {
            const checklistButton = e.target.closest('#checklist-agenda-button');
            if (checklistButton) {
                const { auditTypeId, auditTypeName } = checklistButton.dataset;
                const agendaId = document.getElementById('event-id').value; // Ambil ID agenda dari form
                // Ambil status dari dropdown di form agenda
                const status = ui.addEventForm.elements['status'].value;
                if (auditTypeId && agendaId) {
                    showAgendaChecklist(agendaId, auditTypeId, auditTypeName, status);
                }
            }
        });

        // User menu dropdown
        if (ui.userMenuButton && ui.userMenuDropdown) {
            ui.userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Mencegah window click event
                ui.userMenuDropdown.classList.toggle('hidden');
            });
        }

        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            if (ui.userMenuDropdown && !ui.userMenuDropdown.classList.contains('hidden')) {
                ui.userMenuDropdown.classList.add('hidden');
            }
        });

        // Change Password Modal Logic
        if (ui.changePasswordButton && ui.changePasswordModal) {
            ui.changePasswordButton.addEventListener('click', (e) => {
                e.preventDefault();
                ui.changePasswordModal.classList.remove('hidden');
                ui.userMenuDropdown.classList.add('hidden');
            });

            ui.closeChangePasswordModalButton.addEventListener('click', () => {
                ui.changePasswordModal.classList.add('hidden');
                if (ui.changePasswordForm) {
                    ui.changePasswordForm.reset();
                }
            });
        }

        // Logout button
        if (ui.logoutButton) {
            ui.logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                // In a real app, you'd also clear server-side session/token
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
            });
        }

        // Handle Change Password Form Submission
        if (ui.changePasswordForm) {
            ui.changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = ui.changePasswordForm.elements['current-password'].value;
                const newPassword = ui.changePasswordForm.elements['new-password'].value;
                const confirmPassword = ui.changePasswordForm.elements['confirm-password'].value;

                if (newPassword !== confirmPassword) {
                    alert('Password baru dan konfirmasi tidak cocok.');
                    return;
                }

                try {
                    const result = await apiFetch(`${API_BASE_URL}/users/change-password`, {
                        method: 'POST',
                        body: JSON.stringify({ currentPassword, newPassword })
                    });

                    showToast(result.message || 'Password berhasil diubah.');
                    ui.changePasswordModal.classList.add('hidden');
                    ui.changePasswordForm.reset();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    };
    /**
     * Menyuntikkan CSS untuk animasi toast ke dalam dokumen.
     */
    function injectToastStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes fade-in-right { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
            @keyframes fade-out-right { from { opacity: 0; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
            .animate-fade-in-right { animation: fade-in-right 0.5s ease-out forwards; }
            .animate-fade-out-right { animation: fade-out-right 0.5s ease-in forwards; }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Menyuntikkan CSS untuk kalender agar teks bisa wrap.
     */
    function injectCalendarStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .fc-event-title {
                white-space: normal !important; /* Memaksa teks untuk wrap */
                overflow-wrap: break-word;     /* Memecah kata yang terlalu panjang */
                line-height: 1.3;              /* Memberi sedikit ruang antar baris */
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Menyuntikkan CSS untuk membuat tabel dasbor bisa di-scroll.
     */
    function injectDashboardStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .dashboard-scrollable-table-container {
                max-height: 400px; /* Anda bisa sesuaikan tinggi ini */
                overflow-y: auto;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Menambahkan tombol "Kembali ke Settings" secara dinamis ke halaman-halaman manajemen.
     */
    const addBackButtonsToManagementPages = () => {
        // Daftar semua halaman yang diakses dari menu Settings
        const pagesWithBackButton = [
            'user-management', 
            'hotel-management', 
            'audit-type-management',
            'audit-checklist-management',
            'role-management',
            'report-target-management'
        ];

        pagesWithBackButton.forEach(pageId => {
            const section = document.getElementById(pageId);
            // Cek apakah section ada dan belum memiliki tombol kembali ke settings.
            // Menggunakan 'a[data-target="settings"]' sebagai selector yang lebih andal untuk mencegah duplikasi.
            if (section && !section.querySelector('a[data-target="settings"]')) {
                const backButton = document.createElement('a');
                backButton.href = '#';
                backButton.dataset.target = 'settings';
                backButton.className = 'nav-trigger back-to-settings-button mb-6 inline-flex items-center text-indigo-600 hover:text-indigo-800 group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md';
                backButton.innerHTML = `<i data-feather="arrow-left" class="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1"></i> Kembali ke Settings`;

                // Tambahkan event listener secara manual karena tombol ini dibuat setelah listener utama di-bind
                backButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo('settings', backButton);
                });

                // Letakkan tombol di bagian paling atas section
                section.prepend(backButton);
            }
        });
    };

    const setupSohReportListeners = () => {
        if (!ui.reportSohFilterButton) return;

        // Filter button listener
        ui.reportSohFilterButton.addEventListener('click', async () => {
            const hotelId = ui.reportSohHotelSelector.value;
            const startDate = ui.reportSohStartDate.value;
            const endDate = ui.reportSohEndDate.value;

            const params = new URLSearchParams();
            if (hotelId) params.append('hotel_id', hotelId);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            // Backend needs to provide this summary endpoint
            const url = `${API_BASE_URL}/soh-inventory-reports/summary?${params.toString()}`;
            
            try {
                const data = await apiFetch(url);
                renderSohSummaryTable(data);
            } catch (error) {
                showToast(`Gagal memuat ringkasan SOH: ${error.message}`, 'error');
                renderSohSummaryTable([]);
            }
        });

        // Event delegation for "Lihat Detail" button (clicking the whole row)
        if (ui.reportSohSummaryTableBody) {
            ui.reportSohSummaryTableBody.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-report-id]');
                if (row) {
                    fetchAndRenderSohDetail(row.dataset.reportId);
                }
            });
        }

        // Download button listener
        if (ui.reportSohDownloadButton) {
            ui.reportSohDownloadButton.addEventListener('click', () => {
                if (currentSohSummaryData.length === 0) {
                    showToast('Tidak ada data untuk diunduh.', 'error');
                    return;
                }
                try {
                    const dataToExport = currentSohSummaryData.map(row => ({
                        'Nama Hotel': row.hotel_name,
                        'Tanggal Laporan': new Date(row.report_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                        'Total Food': parseFloat(row.total_food),
                        'Total Beverage': parseFloat(row.total_beverage),
                        'Total Material': parseFloat(row.total_material),
                        'Total Keseluruhan': parseFloat(row.total_overall),
                    }));

                    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ringkasan SOH');
                    
                    const today = new Date().toISOString().slice(0, 10);
                    XLSX.writeFile(workbook, `Ringkasan_SOH_Inventory_${today}.xlsx`);
                } catch (error) {
                    showToast('Gagal membuat file Excel.', 'error');
                }
            });
        }
    };
    // ===================================================================
    // 5. MAIN EVENT BINDING & INITIALIZATION
    // ===================================================================

    const bindEventListeners = () => {
        setupCoreListeners();
        setupDashboardListeners();
        setupUserManagement();
        setupHotelManagement();
        setupAuditTypeManagementListeners();
        setupChecklistManagement();
        setupRoleManagement();
        setupAgendaModalListeners();
        setupChecklistViewModalListeners();
        setupAgendaViewListeners();
        setupReportPageListeners();
        setupSubmitIncomeAuditPage();
        setupIncomeAuditTableEditing();
        setupDeleteIncomeAuditListeners();
        setupSubmitArAgingPage();
        setupSubmitApAgingPage();
        setupDeleteApAgingListeners();
        setupDeleteArAgingListeners();
        setupArAgingReportViewListeners();
        setupApAgingReportViewListeners();
        setupReportTargetListeners();
        setupSohReportListeners();
        setupSubmitSohInventoryPage();
        setupDeleteSohInventoryListeners();
        setupServiceChargeCalculations(); // Panggil fungsi kalkulasi saat setup listener
        setupSubmitServiceChargeListeners();
        setupGlClosingForm();

        const setupIncomeAuditSummaryListeners = () => {
            const filterButton = ui.reportIaFilterButton;
            if (!filterButton) return;

            filterButton.addEventListener('click', async () => {
                const hotelId = ui.reportIaHotelSelector.value;
                const startDate = ui.reportIaStartDate.value;
                const endDate = ui.reportIaEndDate.value;

                if (!startDate || !endDate) {
                    showToast('Silakan pilih rentang tanggal terlebih dahulu.', 'error');
                    return;
                }

                const params = new URLSearchParams();
                if (hotelId) params.append('hotel_id', hotelId);
                params.append('start_date', startDate);
                params.append('end_date', endDate);

                const url = `${API_BASE_URL}/income-audit-reports/summary?${params.toString()}`;
                filterButton.disabled = true;
                filterButton.innerHTML = `<i data-feather="loader" class="w-4 h-4 mr-2 animate-spin"></i> Memuat...`;
                if (typeof feather !== 'undefined') feather.replace();

                try {
                    const data = await apiFetch(url);
                    renderIncomeAuditSummaryTable(data);
                } catch (error) {
                    showToast(`Gagal memuat laporan: ${error.message}`, 'error');
                    renderIncomeAuditSummaryTable([]);
                } finally {
                    filterButton.disabled = false;
                    filterButton.innerHTML = `<i data-feather="filter" class="w-4 h-4 mr-2"></i> Tampilkan`;
                    if (typeof feather !== 'undefined') feather.replace();
                }
            });

            const downloadButton = ui.reportIaDownloadButton;
            if (downloadButton) {
                downloadButton.addEventListener('click', () => {
                    if (currentIncomeAuditSummaryData.length === 0) {
                        return showToast('Tidak ada data untuk diunduh.', 'error');
                    }
                    try {
                        // Mengubah data agar formatnya sama dengan tabel di layar (satu baris per hotel)
                        const dataToExport = currentIncomeAuditSummaryData.map(hotel => {
                            const row = { 'Hotel': hotel.hotel_name };

                            // Helper untuk menambahkan data periode ke baris
                            const addPeriodData = (periodData, prefix) => {
                                const p = periodData || {};
                                row[`${prefix} - Room Avail`] = p.room_available;
                                row[`${prefix} - Room Sold`] = p.room_sold;
                                row[`${prefix} - % Occp`] = p.occp_percent;
                                row[`${prefix} - ARR`] = p.arr;
                                row[`${prefix} - Room Rev`] = p.room_revenue;
                                row[`${prefix} - F&B Rev`] = p.fnb_revenue;
                                row[`${prefix} - Others Rev`] = p.others_revenue;
                                row[`${prefix} - Total Rev`] = p.total_revenue;
                            };

                            // Tambahkan data untuk setiap periode dengan prefix yang sesuai
                            addPeriodData(hotel.period, 'Today');
                            addPeriodData(hotel.mtd, 'Period'); // 'mtd' di data sesuai dengan label 'Period' di UI
                            addPeriodData(hotel.ytd, 'Year to Date');

                            return row;
                        });

                        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ringkasan Income Audit');
                        const startDate = ui.reportIaStartDate.value;
                        const endDate = ui.reportIaEndDate.value;
                        const datePart = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
                        XLSX.writeFile(workbook, `Ringkasan_Income_Audit_${datePart}.xlsx`);
                    } catch (error) { showToast('Gagal membuat file Excel.', 'error'); }
                });
            }
        };
        const setupServiceChargeReportViewListeners = () => {
            const filterButton = ui.reportScFilterButton;
            const tableBody = ui.reportScTableBody;
            const downloadButton = ui.reportScDownloadButton;
        
            if (!filterButton || !tableBody) return;
        
            filterButton.addEventListener('click', async () => {
                const hotelId = ui.reportScHotelSelector.value;
                const startDate = ui.reportScStartDate.value;
                const endDate = ui.reportScEndDate.value;
        
                const params = new URLSearchParams();
                if (hotelId) params.append('hotel_id', hotelId);
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
        
                const url = `${API_BASE_URL}/service-charge-reports?${params.toString()}`;
                
                try {
                    const data = await apiFetch(url);
                    renderServiceChargeReportTable(data);
                } catch (error) {
                    showToast(`Gagal memuat laporan: ${error.message}`, 'error');
                    renderServiceChargeReportTable([]); // Kosongkan tabel jika error
                }
            });
        
            tableBody.addEventListener('click', async (e) => {
                const deleteButton = e.target.closest('.delete-sc-report-btn');
                if (!deleteButton) return;
        
                const reportId = deleteButton.dataset.id;
                const tableRow = deleteButton.closest('tr');
                const hotelName = tableRow.querySelector('td:first-child').textContent;
                const reportDate = tableRow.querySelector('td:nth-child(2)').textContent;
        
                if (!confirm(`Apakah Anda yakin ingin menghapus laporan Service Charge untuk ${hotelName} pada tanggal ${reportDate}?`)) {
                    return;
                }
        
                try {
                    const result = await apiFetch(`${API_BASE_URL}/service-charge-reports/${reportId}`, { method: 'DELETE' });
                    showToast(result.msg || 'Laporan berhasil dihapus.', 'success');
                    if (filterButton) filterButton.click(); // Muat ulang data
                } catch (error) {
                    showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
                }
            });
        };
        const setupGlClosingReportViewListeners = () => {
            if (!glReportUi.filterButton) return;
        
            glReportUi.filterButton.addEventListener('click', async () => {
                const params = new URLSearchParams();
                if (glReportUi.hotelSelector.value) params.append('hotel_id', glReportUi.hotelSelector.value);
                if (glReportUi.startDate.value) params.append('start_date', glReportUi.startDate.value);
                if (glReportUi.endDate.value) params.append('end_date', glReportUi.endDate.value);
        
                const url = `${API_BASE_URL}/gl-closing-reports?${params.toString()}`;
                
                try {
                    const data = await apiFetch(url);
                    renderGlClosingReportViewTable(data);
                } catch (error) {
                    showToast(`Gagal memuat laporan: ${error.message}`, 'error');
                }
            });
        
            glReportUi.downloadButton.addEventListener('click', () => {
                if (currentGlClosingReportData.length === 0) return showToast('Tidak ada data untuk diunduh.', 'error');
                try {
                    const dataToExport = currentGlClosingReportData.map(row => ({
                        'Hotel': row.hotel_name, 'Tanggal': new Date(row.report_date).toLocaleDateString('id-ID'),
                        'Actual Revenue': parseFloat(row.actual_revenue), 'Actual Expenses': parseFloat(row.actual_expenses),
                        'Actual GOP': parseFloat(row.actual_gop), 'Actual %GOP': parseFloat(row.actual_gop_ratio),
                        'Budget Revenue': parseFloat(row.budget_revenue), 'Budget Expenses': parseFloat(row.budget_expenses),
                        'Budget GOP': parseFloat(row.budget_gop), 'Budget %GOP': parseFloat(row.budget_gop_ratio),
                        'Link Dokumen': row.gdrive_link,
                    }));
                    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan P&L');
                    XLSX.writeFile(workbook, `Laporan_PL_GL_Closing_${new Date().toISOString().slice(0, 10)}.xlsx`);
                } catch (error) { showToast('Gagal membuat file Excel.', 'error'); }
            });
        };
        const setupGlClosingReportDeleteListeners = () => {
            if (!glReportUi.tableBody) return;
        
            glReportUi.tableBody.addEventListener('click', async (e) => {
                const deleteButton = e.target.closest('.delete-gl-report-btn');
                if (!deleteButton) return;
        
                const reportId = deleteButton.dataset.id;
                const tableRow = deleteButton.closest('tr');
                const hotelName = tableRow.querySelector('td:first-child').textContent;
                const reportDate = tableRow.querySelector('td:nth-child(2)').textContent;
        
                if (!confirm(`Apakah Anda yakin ingin menghapus laporan untuk ${hotelName} pada tanggal ${reportDate}?`)) {
                    return;
                }
        
                try {
                    const result = await apiFetch(`${API_BASE_URL}/gl-closing-reports/${reportId}`, {
                        method: 'DELETE'
                    });
                    showToast(result.msg || 'Laporan berhasil dihapus.', 'success');
                    
                    // Refresh the table by re-triggering the filter
                    if (glReportUi.filterButton) {
                        glReportUi.filterButton.click();
                    }
                } catch (error) {
                    showToast(`Gagal menghapus laporan: ${error.message}`, 'error');
                }
            });
        };

        // Modal close listeners
        if (ui.closeSohDetailModalButton) {
            ui.closeSohDetailModalButton.addEventListener('click', () => {
                ui.sohDetailModal.classList.add('hidden');
            });
        }
        if (ui.sohDetailModal) {
            ui.sohDetailModal.addEventListener('click', (e) => {
                if (e.target === ui.sohDetailModal) {
                    ui.sohDetailModal.classList.add('hidden');
                }
            });
        }

        if (ui.downloadSohDetailButton) {
            ui.downloadSohDetailButton.addEventListener('click', () => {
                if (currentSohDetailData.length === 0) {
                    showToast('Tidak ada data detail untuk diunduh.', 'error');
                    return;
                }
                try {
                    const dataToExport = currentSohDetailData.map(row => ({
                        'Date': new Date(row.date).toLocaleDateString('id-ID'),
                        'Storage': row.storage,
                        'Article': row.article,
                        'Description': row.description,
                        'Unit': row.unit,
                        'Actual Qty': parseFloat(row.actual_qty),
                        'Actual Value': parseFloat(row.actual_value),
                        'Act P-Price': parseFloat(row.act_p_price),
                        'Avrg Price': parseFloat(row.avrg_price),
                        'Sub Group': row.sub_group
                    }));

                    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detail SOH');
                    
                    const firstRow = currentSohDetailData[0];
                    const hotelName = (firstRow.hotel_name || 'Hotel').replace(/ /g, '_');
                    const reportDate = new Date(firstRow.date).toISOString().slice(0, 10);
                    XLSX.writeFile(workbook, `Detail_SOH_${hotelName}_${reportDate}.xlsx`);
                } catch (error) {
                    showToast('Gagal membuat file Excel detail.', 'error');
                }
            });
        }
        setupGlClosingReportViewListeners();
        setupGlClosingReportDeleteListeners();
        setupIncomeAuditSummaryListeners();
        setupServiceChargeReportViewListeners();
        // Tambahkan fungsi setup lain di sini jika ada fitur baru
    };

    // 6. App Initialization
    const init = async () => {
        // 1. Ambil data pengguna dari token yang tersimpan
        appState.currentUser = getCurrentUserFromToken();

        // Jika tidak ada pengguna (token tidak ada/tidak valid), redirect ke login
        if (!appState.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // 2. Jika pengguna terdeteksi, ambil daftar izinnya dari backend
        if (appState.currentUser.role_id) {
            try {
                // Backend harus memiliki endpoint ini: GET /api/roles/:id/permissions
                const permissions = await apiFetch(`${API_BASE_URL}/roles/${appState.currentUser.role_id}/permissions`);
                // Simpan daftar izin ke state aplikasi
                appState.currentUser.permissions = permissions;
            } catch (error) {
                console.error('Gagal mengambil izin untuk peran pengguna. Sesi akan diakhiri.', error);
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                return; // Hentikan proses inisialisasi
            }
        } else {
            // Jika token tidak memiliki role_id, anggap sesi tidak valid
            console.error('Token tidak memiliki role_id. Sesi tidak valid.');
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
            return;
        }

        // 3. SEKARANG, panggil applyUIPermissions setelah semua data siap
        applyUIPermissions();

        // 4. Lanjutkan dengan sisa inisialisasi aplikasi
        ui.logoutButton = document.getElementById('logout-button');
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        bindEventListeners();
        injectToastStyles();
        injectCalendarStyles(); // Tambahkan ini
        injectDashboardStyles(); // Tambahkan ini juga
        addBackButtonsToManagementPages();
        navigateTo('dashboard');
    };

    init().catch(err => console.error("Inisialisasi aplikasi gagal:", err));
});
