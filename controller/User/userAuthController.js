const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../../models/User/User');
const { generateOTP, sendEmail } = require("../../utils/otpUtils")

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        res.status(400);
        throw new Error('User already exists with this email');
    }

    const user = new User({ name, email, password });

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;

    await user.save();

    await sendEmail({
        to: email,
        subject: 'Your OTP for Yoga Platform',
        otp
    });

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        verificationId: user._id
    });
});

exports.verifyOTP = asyncHandler(async (req, res) => {
    const { verificationId, otp } = req.body;

    const user = await User.findOne({
        _id: verificationId,
        otp: { $exists: true }
    }).select('+otp +otpExpiry');

    if (!user) {
        res.status(400);
        throw new Error('Invalid verification request');
    }

    // Check if OTP is expired
    if (user.otpExpiry < Date.now()) {
        res.status(400);
        throw new Error('OTP has expired. Please request a new one.');
    }

    // Check if OTP is invalid
    if (user.otp !== otp) {
        res.status(400);
        throw new Error('Invalid OTP. Please enter the correct one.');
    }

    // All good: verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });

    res.cookie('user-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        }
    });
});


exports.login = asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    if (!user.isVerified) {
        res.status(403);
        throw new Error('Please verify your email first');
    }

    user.lastLogin = Date.now();
    await user.save();

    const expiresIn = rememberMe ? '7d' : '1d';
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn
    });

    res.cookie('user-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        }
    });
});




exports.logout = asyncHandler(async (req, res) => {
    res.cookie('user-auth', 'none', {
        httpOnly: true,
        expires: new Date(Date.now() + 5 * 1000)
    });

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
});

