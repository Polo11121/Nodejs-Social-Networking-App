const express = require('express');
const messageController = require('./../controllers/messageController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    messageController.uploadMessagePhotos,
    messageController.resizeMessagePhotos,
    messageController.addMessage
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('user'),
    messageController.getAllMessages
  );

module.exports = router;
