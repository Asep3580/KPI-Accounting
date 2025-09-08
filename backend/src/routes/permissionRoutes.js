const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Hanya Admin yang boleh melihat daftar semua permission
router.get('/', authenticateToken, checkPermission('view:settings'), permissionController.getAllPermissions);

module.exports = router;