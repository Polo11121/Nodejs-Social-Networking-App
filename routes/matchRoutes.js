const express = require('express');
const matchController = require('../controllers/matchController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('user'));

router.get('/', matchController.getMatches);

router.get('/users', matchController.getUsers);

router.get('/newMatches', matchController.getNewMatches);

router.put('/match', matchController.match);

module.exports = router;
