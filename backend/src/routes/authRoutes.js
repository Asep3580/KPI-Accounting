const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route untuk login: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;