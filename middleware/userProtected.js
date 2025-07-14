const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User/User');

const userProtected = asyncHandler(async (req, res, next) => {
    const token = req.cookies['user-auth'];

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, token missing');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            res.status(401);
            throw new Error('User not found');
        }
        next();
    } catch (error) {
        res.status(401);
        throw new Error('Invalid or expired token');
    }
});

module.exports = { userProtected };
