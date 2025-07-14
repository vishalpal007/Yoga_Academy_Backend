const express = require('express');
const router = express.Router();
const userAuthController = require('../../controller/User/userAuthController');

router.post('/register', userAuthController.register);

router.post('/verify-otp', userAuthController.verifyOTP);

router.post('/login', userAuthController.login);

router.post('/logout', userAuthController.logout);


module.exports = router;
