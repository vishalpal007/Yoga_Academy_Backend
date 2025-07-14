const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Admin = require('../models/Admin/Admin');

const adminProtected = asyncHandler(async (req, res, next) => {
    const token = req.cookies['admin-auth'];

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, admin token missing');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            res.status(401);
            throw new Error('Admin not found');
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401);
        throw new Error('Token invalid or expired');
    }
});

module.exports = { adminProtected };
