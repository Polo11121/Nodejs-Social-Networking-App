const express = require('express');
const matchController = require('../controllers/matchController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('user'));

router.get('/', matchController.getMatches);

router.get('/matchingUsers', matchController.getMatchingUsers);

router.get('/newMatches', matchController.getNewMatches);

router.patch('/swipe', matchController.swipe);

module.exports = router;
