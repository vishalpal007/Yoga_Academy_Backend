const asyncHandler = require("express-async-handler");
const fs = require('fs');
const Course = require("../../models/Admin/Course");
const path = require('path');
const { adminProtected } = require("../../middleware/adminProtected");
const cloudinary = require("../../utils/cloudnary");

// Public routes
exports.getAllCourses = asyncHandler(async (req, res) => {
    const { category, level, minPrice, maxPrice, isFree, search } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (isFree) filter.isFree = isFree === 'true';
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const courses = await Course.find(filter)
        .sort({ createdAt: -1 })
        .select('-__v');

    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses
    });
});

exports.getCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id)
        .select('-__v');

    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    res.status(200).json({
        success: true,
        data: course
    });
});

exports.getFeaturedCourses = asyncHandler(async (req, res) => {
    const featuredCourses = await Course.find({ isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(4)
        .select('title thumbnail price isFree duration');

    res.status(200).json({
        success: true,
        count: featuredCourses.length,
        data: featuredCourses
    });
});

exports.createCourse = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const { title, description, category, level, duration, price } = req.body;

        // Validate required fields
        if (!title || !description || !category || !level || !duration || price === undefined) {
            res.status(400);
            throw new Error("All fields are required: title, description, category, level, duration, price");
        }

        // Check thumbnail
        if (!req.file) {
            res.status(400);
            throw new Error("Thumbnail file is required");
        }

        // Validate price
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
            res.status(400);
            throw new Error("Price must be a valid number");
        }

        // Upload to Cloudinary
        let thumbnailUrl;
        try {
            const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                folder: 'yoga-thumbnails',
                public_id: `thumb-${Date.now()}`,
                transformation: [
                    { width: 800, height: 450, crop: 'fill' },
                    { quality: 'auto:best' }
                ]
            });
            thumbnailUrl = uploadResult.secure_url;
        } catch (cloudErr) {
            console.error('Cloudinary upload error:', cloudErr);
            res.status(500);
            throw new Error("Failed to upload thumbnail to Cloudinary");
        } finally {
            try {
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (unlinkErr) {
                console.warn("Warning: Failed to delete temporary file", unlinkErr.message);
            }
        }

        // Create course
        try {
            const newCourse = await Course.create({
                title,
                description,
                category,
                level,
                duration: parseFloat(duration),
                price: parsedPrice,
                isFree: parsedPrice === 0,
                thumbnail: thumbnailUrl,
                liveSessions: [],
                recordedVideos: [],
                enrolledUsers: []
            });

            res.status(201).json({
                success: true,
                message: "Course created successfully",
                data: {
                    id: newCourse._id,
                    title: newCourse.title,
                    description: newCourse.description,
                    thumbnail: newCourse.thumbnail,
                    category: newCourse.category,
                    level: newCourse.level,
                    duration: newCourse.duration,
                    price: newCourse.price,
                    isFree: newCourse.isFree,
                    createdAt: newCourse.createdAt
                }
            });
        } catch (dbErr) {
            console.error('Database error:', dbErr);
            res.status(500);
            throw new Error("Failed to create course in database");
        }
    })
];

exports.updateCourse = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const courseId = req.params.id;

        const existingCourse = await Course.findById(courseId);
        if (!existingCourse) {
            res.status(404);
            throw new Error("Course not found");
        }

        const {
            title,
            description,
            category,
            level,
            duration,
            price,
        } = req.body;

        let newThumbnailUrl = null;
        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: 'yoga-thumbnails',
                    public_id: `thumb-${Date.now()}`,
                    transformation: [
                        { width: 800, height: 450, crop: 'fill' },
                        { quality: 'auto:best' }
                    ]
                });
                newThumbnailUrl = result.secure_url;
            } catch (cloudErr) {
                console.error("Cloudinary Error:", cloudErr);
                res.status(500);
                throw new Error("Failed to upload new thumbnail");
            } finally {
                if (req.file?.path) {
                    fs.unlinkSync(req.file.path);
                }
            }
        }

        if (title !== undefined) existingCourse.title = title;
        if (description !== undefined) existingCourse.description = description;
        if (category !== undefined) existingCourse.category = category;
        if (level !== undefined) existingCourse.level = level;
        if (duration !== undefined) existingCourse.duration = parseFloat(duration);
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice)) {
                res.status(400);
                throw new Error("Price must be a valid number");
            }
            existingCourse.price = parsedPrice;
            existingCourse.isFree = parsedPrice === 0;
        }

        if (newThumbnailUrl) {
            existingCourse.thumbnail = newThumbnailUrl;
        }

        existingCourse.updatedAt = new Date();

        try {
            const updatedCourse = await existingCourse.save();
            res.status(200).json({
                success: true,
                message: "Course updated successfully",
                data: updatedCourse
            });
        } catch (err) {
            console.error("DB Update Error:", err);
            res.status(500);
            throw new Error("Failed to update course in database");
        }
    })
];

exports.deleteCourse = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const course = await Course.findById(req.params.id);

        if (!course) {
            res.status(404);
            throw new Error('Course not found');
        }

        try {
            if (course.thumbnail) {
                const publicId = course.thumbnail.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`yoga-thumbnails/${publicId}`);
            }

            await course.remove();

            res.status(200).json({
                success: true,
                message: 'Course deleted successfully',
                data: {}
            });
        } catch (err) {
            console.error('Delete Error:', err);
            res.status(500);
            throw new Error('Failed to delete course');
        }
    })
];

exports.getCourseStats = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const stats = await Course.aggregate([
            {
                $group: {
                    _id: null,
                    totalCourses: { $sum: 1 },
                    totalFree: { $sum: { $cond: [{ $eq: ['$isFree', true] }, 1, 0] } },
                    totalPaid: { $sum: { $cond: [{ $eq: ['$isFree', false] }, 1, 0] } },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalCourses: 1,
                    totalFree: 1,
                    totalPaid: 1,
                    avgPrice: { $round: ['$avgPrice', 2] },
                    minPrice: 1,
                    maxPrice: 1
                }
            }
        ]);

        const categoryStats = await Course.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        const levelStats = await Course.aggregate([
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: stats[0] || {},
                byCategory: categoryStats,
                byLevel: levelStats
            }
        });
    })
];

exports.toggleFeatured = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const course = await Course.findById(req.params.id);

        if (!course) {
            res.status(404);
            throw new Error('Course not found');
        }

        course.isFeatured = !course.isFeatured;
        await course.save();

        res.status(200).json({
            success: true,
            message: `Course ${course.isFeatured ? 'added to' : 'removed from'} featured`,
            data: {
                id: course._id,
                isFeatured: course.isFeatured
            }
        });
    })
];