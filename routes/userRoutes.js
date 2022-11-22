const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.patch('/confirmAccount/:token', authController.confirmAccount);
router.patch('/confirmEmail/:token', authController.confirmEmail);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.get(
  '/:id',
  authController.protect,
  authController.restrictTo('user', 'admin'),
  userController.getUser
);

router.use(authController.protect, authController.restrictTo('user'));

router.patch('/updatePassword', authController.updatePassword);
router.patch('/changeEmail', authController.changeEmail);
router.patch('/deleteUser', authController.deleteUser);

router.patch(
  '/updateUser',
  userController.uploadUserPhotos,
  userController.resizeUserProfilePhotos,
  userController.updateUser
);

router.get('/', userController.getUsers);

module.exports = router;
