const express = require('express');

const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(authController.restrictTo('admin'), reportController.getReports)
  .post(
    authController.restrictTo('user', 'admin'),
    reportController.createReport
  );

router.use(authController.protect, authController.restrictTo('admin'));

router.get('/new', reportController.getNewReports);

router.get('/', reportController.getReports);

router.patch('/:id', reportController.updateReport);

router.get('/user/:id', reportController.getUserReports);

module.exports = router;
