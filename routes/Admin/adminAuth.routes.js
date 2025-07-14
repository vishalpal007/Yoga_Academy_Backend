const express = require('express');
const router = express.Router();
const adminAuthController = require("../../controller/Admin/adminAuthController");
const { adminProtected } = require('../../middleware/adminProtected');


router
    .post('/register', adminAuthController.registerAdmin)
    .post('/login', adminAuthController.loginAdmin)
    .post('/logout', adminAuthController.logoutAdmin)
    .get('/me', adminProtected, adminAuthController.getAdminProfile)

module.exports = router;
