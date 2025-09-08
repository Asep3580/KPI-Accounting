const express = require('express');
const router = express.Router();
const auditTypeController = require('../controllers/auditTypeController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Lindungi semua rute dengan otentikasi dan izin 'edit:audit-types'. Admin akan lolos otomatis.
router.use(authenticateToken, checkPermission('edit:audit-types'));

router.get('/', auditTypeController.getAllAuditTypes);
router.post('/', auditTypeController.createAuditType);
router.put('/:id', auditTypeController.updateAuditType);
router.delete('/:id', auditTypeController.deleteAuditType);

module.exports = router;