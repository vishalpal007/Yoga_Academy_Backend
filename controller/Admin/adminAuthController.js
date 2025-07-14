const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin/Admin');

const generateToken = (adminId) => {
    return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

const setTokenCookie = (res, token) => {
    res.cookie('admin-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};


exports.registerAdmin = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('All fields are required');
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
        res.status(400);
        throw new Error('Admin already exists with this email');
    }

    const newAdmin = await Admin.create({ name, email, password });

    const token = generateToken(newAdmin._id);
    setTokenCookie(res, token);

    res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        admin: {
            id: newAdmin._id,
            name: newAdmin.name,
            email: newAdmin.email
        }
    });
});



exports.loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const token = generateToken(admin._id);
    admin.lastLogin = Date.now();
    await admin.save();

    setTokenCookie(res, token);

    res.status(200).json({
        success: true,
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email
        }
    });
});

exports.logoutAdmin = asyncHandler(async (req, res) => {
    res.cookie('admin-auth', 'none', {
        httpOnly: true,
        expires: new Date(Date.now() + 5 * 1000)
    });

    res.status(200).json({
        success: true,
        message: 'Admin logged out successfully'
    });
});

exports.getAdminProfile = asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
        res.status(404);
        throw new Error('Admin not found');
    }

    res.status(200).json({
        success: true,
        admin
    });
});
