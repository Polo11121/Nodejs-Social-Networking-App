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

router.get(
  '/new',
  authController.restrictTo('admin'),
  reportController.getNewReports
);

router.get(
  '/',
  authController.restrictTo('admin'),
  reportController.getReports
);

router.patch(
  '/:id',
  authController.restrictTo('admin'),
  reportController.updateReport
);

router.get(
  '/user/:id',
  authController.restrictTo('admin'),
  reportController.getUserReports
);

module.exports = router;
