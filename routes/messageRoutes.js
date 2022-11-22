const express = require('express');
const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('user'));

router
  .route('/')
  .post(
    messageController.uploadMessagePhotos,
    messageController.resizeMessagePhotos,
    messageController.addMessage
  );

router.route('/lastMessages').get(messageController.getLastMessages);

router.route('/unreadMessages').get(messageController.getUnreadMessages);

router.route('/:id').get(messageController.getAllMessages);

module.exports = router;
