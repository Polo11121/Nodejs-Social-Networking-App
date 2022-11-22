const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('admin'));

router.get('/', adminController.getAdministrators);

router.get('/dashboardCounters', adminController.getDashboardCounters);

router.get('/users', adminController.getUsers);

router.get('/:id/reportsCounters', adminController.getAdminReportsCounters);

router.patch('/user/:id/unblock', adminController.unblockUser);

module.exports = router;
