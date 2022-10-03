const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect, authController.restrictTo('user'));

router.patch('/updateMyPassword', authController.updatePassword);

router.patch(
  '/updateMe',
  userController.uploadUserPhotos,
  userController.resizeUserProfilePhotos,
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

router.route('/:id').get(userController.getUser);

module.exports = router;
