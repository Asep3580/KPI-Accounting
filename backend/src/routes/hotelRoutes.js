const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Terapkan middleware untuk semua rute di file ini.
// Hanya pengguna yang memiliki izin 'edit:hotels' yang bisa melanjutkan. Admin akan lolos otomatis.
router.use(authenticateToken, checkPermission('edit:hotels'));

// Definisikan rute CRUD untuk hotel
router.get('/', hotelController.getAllHotels);
router.post('/', hotelController.createHotel);
router.put('/:id', hotelController.updateHotel);
router.delete('/:id', hotelController.deleteHotel);

module.exports = router;