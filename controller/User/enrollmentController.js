const asyncHandler = require("express-async-handler");
const { adminProtected } = require("../../middleware/adminProtected");
const { userProtected } = require("../../middleware/userProtected");
const Enrollment = require("../../models/User/Enrollment");
const Course = require("../../models/Admin/Course");
const User = require("../../models/User/User");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// @desc    Enroll in a course
// @route   POST /api/enroll/:courseId
// @access  User protected
exports.enrollCourse = [
    userProtected,
    asyncHandler(async (req, res) => {
        const courseId = req.params.courseId;
        const userId = req.user._id;

        const course = await Course.findById(courseId);
        if (!course) {
            res.status(404);
            throw new Error("Course not found");
        }

        const existingEnrollment = await Enrollment.findOne({
            user: userId,
            course: courseId,
        });

        if (existingEnrollment) {
            res.status(400);
            throw new Error("You're already enrolled in this course");
        }

        // Free course flow
        if (course.isFree) {
            const enrollment = await Enrollment.create({
                user: userId,
                course: courseId,
                paymentDetails: {
                    status: "free",
                    amount: 0,
                },
                access: { isActive: true },
                progress: {
                    overallCompletion: 0,
                    completedVideos: []
                }
            });

            // ✅ Update User's enrolledCourses
            await User.findByIdAndUpdate(userId, {
                $addToSet: { enrolledCourses: courseId }
            });

            // ✅ Update Course's enrolledUsers
            course.enrolledUsers.push({
                user: userId,
                paymentStatus: "free"
            });
            await course.save();

            return res.status(201).json({
                success: true,
                message: "Enrolled successfully in free course",
                data: enrollment,
            });
        }

        // Paid course flow
        const paymentIntent = await stripe.paymentIntents.create({
            amount: course.price * 100,
            currency: "inr",
            metadata: { userId, courseId },
        });

        const enrollment = await Enrollment.create({
            user: userId,
            course: courseId,
            paymentDetails: {
                status: "pending",
                amount: course.price,
            },
        });

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            enrollmentId: enrollment._id,
            amount: course.price,
            message: "Payment required to complete enrollment",
        });
    })
];


// @desc    Confirm payment and complete enrollment
// @route   PUT /api/enroll/confirm/:enrollmentId
// @access  User protected
exports.confirmPayment = [
    userProtected,
    asyncHandler(async (req, res) => {
        const enrollmentId = req.params.enrollmentId;
        const userId = req.user._id;

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            user: userId,
        });

        if (!enrollment) {
            res.status(404);
            throw new Error("Enrollment not found");
        }

        if (enrollment.paymentDetails.status !== "pending") {
            res.status(400);
            throw new Error("Payment already processed");
        }

        // In real implementation, verify payment with Stripe webhook
        enrollment.paymentDetails = {
            ...enrollment.paymentDetails,
            status: "paid",
            paymentDate: new Date(),
        };

        const updatedEnrollment = await enrollment.save();

        res.status(200).json({
            success: true,
            message: "Payment confirmed and enrollment completed",
            data: updatedEnrollment,
        });
    })]

// @desc    Get user enrollments
// @route   GET /api/enroll/my-enrollments
// @access  User protected
exports.getUserEnrollments = [
    userProtected,
    asyncHandler(async (req, res) => {
        const enrollments = await Enrollment.find({ user: req.user._id })
            .populate("course", "title thumbnail duration")
            .sort({ enrolledAt: -1 });

        res.status(200).json({
            success: true,
            count: enrollments.length,
            data: enrollments,
        });
    })]

// @desc    Get course content for enrolled user
// @route   GET /api/enroll/course-content/:courseId
// @access  User protected
exports.getCourseContent = [
    userProtected,
    asyncHandler(async (req, res) => {
        const courseId = req.params.courseId;
        const userId = req.user._id;

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            user: userId,
            course: courseId,
            "paymentDetails.status": { $in: ["free", "paid"] },
        });

        if (!enrollment) {
            res.status(403);
            throw new Error("You're not enrolled in this course");
        }

        const course = await Course.findById(courseId)
            .select("liveSessions recordedVideos modules")
            .populate("recordedVideos", "title videoUrl duration")
            .populate("liveSessions", "title dateTime duration meetingLink isCompleted recordingUrl");

        if (!course) {
            res.status(404);
            throw new Error("Course not found");
        }

        // Filter upcoming live sessions
        const now = new Date();
        const upcomingSessions = course.liveSessions.filter(
            (session) => session.dateTime > now
        );

        res.status(200).json({
            success: true,
            data: {
                recordedVideos: course.recordedVideos,
                upcomingLiveSessions: upcomingSessions,
                pastSessions: course.liveSessions.filter(
                    (session) => session.dateTime <= now
                ),
                modules: course.modules,
                enrollmentProgress: enrollment.progress,
            },
        });
    })]

// @desc    Update video progress
// @route   PUT /api/enroll/progress/:enrollmentId
// @access  User protected
exports.updateProgress = [
    userProtected,
    asyncHandler(async (req, res) => {
        const { videoId, progressPercentage } = req.body;
        const enrollmentId = req.params.enrollmentId;
        const userId = req.user._id;

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            user: userId,
        });

        if (!enrollment) {
            res.status(404);
            throw new Error("Enrollment not found");
        }

        // Update or add video progress
        const videoIndex = enrollment.progress.completedVideos.findIndex(
            (v) => v.videoId.toString() === videoId
        );

        if (videoIndex >= 0) {
            enrollment.progress.completedVideos[videoIndex] = {
                videoId,
                progressPercentage,
                completedAt: new Date(),
            };
        } else {
            enrollment.progress.completedVideos.push({
                videoId,
                progressPercentage,
                completedAt: new Date(),
            });
        }

        // Update overall completion (simplified)
        const totalVideos = 10; // Should come from course
        const completed = enrollment.progress.completedVideos.length;
        enrollment.progress.overallCompletion = Math.min(
            Math.round((completed / totalVideos) * 100),
            100
        );

        enrollment.progress.lastAccessed = new Date();
        await enrollment.save();

        res.status(200).json({
            success: true,
            message: "Progress updated",
            data: enrollment.progress,
        });
    })]

// ================= ADMIN ENDPOINTS ================= //

// @desc    Get all enrollments (admin)
// @route   GET /api/admin/enrollments
// @access  Admin protected
exports.getAllEnrollments = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const { status, courseId, userId } = req.query;
        const filter = {};

        if (status) filter["paymentDetails.status"] = status;
        if (courseId) filter.course = courseId;
        if (userId) filter.user = userId;

        const enrollments = await Enrollment.find(filter)
            .populate("user", "name email")
            .populate("course", "title")
            .sort({ enrolledAt: -1 });

        res.status(200).json({
            success: true,
            count: enrollments.length,
            data: enrollments,
        });
    })]

// @desc    Update enrollment (admin)
// @route   PUT /api/admin/enrollments/:id
// @access  Admin protected
exports.updateEnrollment = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment) {
            res.status(404);
            throw new Error("Enrollment not found");
        }

        const { status, access } = req.body;

        if (status) {
            enrollment.paymentDetails.status = status;
        }

        if (access && access.expiresAt) {
            enrollment.access = {
                ...enrollment.access,
                expiresAt: new Date(access.expiresAt),
            };
        }

        if (access && typeof access.isActive === "boolean") {
            enrollment.access.isActive = access.isActive;
        }

        const updatedEnrollment = await enrollment.save();

        res.status(200).json({
            success: true,
            message: "Enrollment updated",
            data: updatedEnrollment,
        });
    })]

// @desc    Get enrollment stats (admin)
// @route   GET /api/admin/enrollments/stats
// @access  Admin protected
exports.getEnrollmentStats = [
    adminProtected,
    asyncHandler(async (req, res) => {
        const stats = await Enrollment.aggregate([
            {
                $group: {
                    _id: null,
                    totalEnrollments: { $sum: 1 },
                    free: { $sum: { $cond: [{ $eq: ["$paymentDetails.status", "free"] }, 1, 0] } },
                    paid: { $sum: { $cond: [{ $eq: ["$paymentDetails.status", "paid"] }, 1, 0] } },
                    totalRevenue: { $sum: "$paymentDetails.amount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalEnrollments: 1,
                    free: 1,
                    paid: 1,
                    totalRevenue: 1
                }
            }
        ]);

        const courseStats = await Enrollment.aggregate([
            {
                $group: {
                    _id: "$course",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "_id",
                    foreignField: "_id",
                    as: "course"
                }
            },
            {
                $unwind: "$course"
            },
            {
                $project: {
                    _id: 0,
                    courseId: "$course._id",
                    courseTitle: "$course.title",
                    enrollments: "$count"
                }
            },
            {
                $sort: { enrollments: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: stats[0] || {},
                byCourse: courseStats
            }
        });
    })]