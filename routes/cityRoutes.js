const express = require('express');

const cityController = require('../controllers/cityController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/:name')
  .get(
    authController.protect,
    authController.restrictTo('user'),
    cityController.getCities
  );

module.exports = router;
