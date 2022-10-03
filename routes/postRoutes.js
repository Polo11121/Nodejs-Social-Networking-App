const express = require('express');
const postController = require('./../controllers/postController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('user'));

router
  .route('/')
  .post(
    postController.uploadPostPhotos,
    postController.resizePostPhotos,
    postController.addPost
  );

router
  .route('/:id')
  .patch(
    postController.uploadPostPhotos,
    postController.resizePostPhotos,
    postController.updatePost
  )
  .delete(postController.deletePost);

module.exports = router;
