const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members');
const attendanceController = require('../controllers/attendance');
const settingsController = require('../controllers/settings');
const classesController = require('../controllers/classes'); 

// Rotas de membros
router.get('/members', membersController.getAllMembers);
router.get('/members/active', membersController.getActiveMembers);
router.get('/members/:id', membersController.getMember);
router.post('/members', membersController.createMember);
router.put('/members/:id', membersController.updateMember);
router.delete('/members/:id', membersController.deleteMember);

// Rotas de frequência
router.post('/attendance', attendanceController.markAttendance);
router.get('/attendance/daily/:date', attendanceController.getDailyAttendance);
router.get('/attendance/summary/:startDate/:endDate', attendanceController.getSummary);
router.delete('/attendance/:date', attendanceController.clearDate);

// Rotas de configurações
router.get('/settings', settingsController.getSettings);
router.get('/settings/:key', settingsController.getSetting);
router.post('/settings', settingsController.updateSettings);

// Rotas de turmas (adicionadas)
router.get('/classes', classesController.getAllClasses);
router.get('/classes/active', classesController.getActiveClasses);
router.get('/classes/:id', classesController.getClass);
router.post('/classes', classesController.createClass);
router.put('/classes/:id', classesController.updateClass);
router.delete('/classes/:id', classesController.deleteClass);

module.exports = router;