const express = require('express');
const router = express.Router();
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const agendaController = require('../controllers/agendaController');
const asyncHandler = require('../middleware/asyncHandler');

// GET all agendas
router.get('/', authenticateToken, asyncHandler(agendaController.getAgendas));

// GET agenda metrics for dashboard
router.get('/metrics', authenticateToken, asyncHandler(agendaController.getAgendaMetrics));

// POST a new agenda
router.post('/', authenticateToken, checkPermission('create:agenda'), asyncHandler(agendaController.createAgenda));

// DELETE an agenda
router.delete('/:id', authenticateToken, checkPermission('delete:agenda'), asyncHandler(agendaController.deleteAgenda));

// Group routes for the /:id/results endpoint
router.route('/:id/results')
    // POST checklist results for an agenda
    .post(authenticateToken, checkPermission('submit:audit'), asyncHandler(agendaController.saveChecklistResults))
    // GET checklist results for a specific agenda
    .get(authenticateToken, checkPermission('view:audit-results'), asyncHandler(agendaController.getChecklistResults));

// PUT (update) an agenda's status
router.put('/:id/status', authenticateToken, checkPermission('update:agenda-status'), asyncHandler(agendaController.updateAgendaStatus));

module.exports = router;