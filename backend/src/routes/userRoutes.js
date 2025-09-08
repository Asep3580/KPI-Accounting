const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// Correctly destructure the imported middleware functions
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Use the authorizeRole function to ensure only 'Admin' can access these routes
router.get('/', authenticateToken, authorizeRole('Admin'), userController.getAllUsers);
router.post('/', authenticateToken, authorizeRole('Admin'), userController.createUser);

// Rute untuk pengguna mengubah password mereka sendiri (tidak perlu admin)
router.post('/change-password', authenticateToken, userController.changePassword);

router.get('/:id', authenticateToken, authorizeRole('Admin'), userController.getUserById);
router.put('/:id', authenticateToken, authorizeRole('Admin'), userController.updateUser);
router.delete('/:id', authenticateToken, authorizeRole('Admin'), userController.deleteUser);

module.exports = router;