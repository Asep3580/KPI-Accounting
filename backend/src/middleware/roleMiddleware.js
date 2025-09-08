/**
 * Middleware untuk memeriksa peran pengguna.
 * @param {string[]} allowedRoles - Array berisi string peran yang diizinkan (e.g., ['admin', 'manager']).
 * @returns Middleware function.
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Pastikan req.user ada (dibuat oleh authMiddleware) dan memiliki informasi peran.
        // Struktur payload token Anda adalah { user: { id, role, ... } }, jadi kita akses req.user.user.role
        if (!req.user || !req.user.user || !req.user.user.role) {
            return res.status(403).json({ message: 'Forbidden: Informasi peran tidak tersedia.' });
        }

        const userRole = req.user.user.role;

        // Cek apakah peran pengguna termasuk dalam daftar peran yang diizinkan.
        if (allowedRoles.includes(userRole)) {
            return next(); // Peran cocok, izinkan akses.
        }

        return res.status(403).json({ message: 'Forbidden: Anda tidak memiliki izin untuk melakukan aksi ini.' });
    };
};

module.exports = checkRole;