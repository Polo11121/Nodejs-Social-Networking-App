const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.patch('/confirmAccount/:token', authController.confirmAccount);
router.patch('/confirmEmail/:token', authController.confirmEmail);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect, authController.restrictTo('user'));

router.patch('/updatePassword', authController.updatePassword);
router.patch('/changeEmail', authController.changeEmail);

router.patch(
  '/updateUser',
  userController.uploadUserPhotos,
  userController.resizeUserProfilePhotos,
  userController.updateUser
);

router.patch('/deleteUser', userController.deleteUser);

router.route('/').get(userController.getUsers);

router.route('/:id').get(userController.getUser);

module.exports = router;
