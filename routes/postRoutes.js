const express = require('express');
const postController = require('./../controllers/postController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(postController.getAllPosts)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    postController.uploadPostPhotos,
    postController.resizePostPhotos,
    postController.addPost
  );

router
  .route('/:id')
  .delete(
    authController.protect,
    authController.restrictTo('user'),
    postController.deletePost
  );

module.exports = router;
