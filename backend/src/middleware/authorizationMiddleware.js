const adminOnly = (req, res, next) => {
    // The user object is nested inside the JWT payload: { user: { id, role, ... } }
    // So we need to check req.user.user.role
    if (req.user && req.user.user && req.user.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Akses ditolak. Hanya untuk admin.' });
};

module.exports = { adminOnly };