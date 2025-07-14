const express = require("express");
const router = express.Router();
const enrollmentController = require("../../controller/User/enrollmentController");

// ========== USER ROUTES ==========

// Enroll in a course
router.post("/:courseId", enrollmentController.enrollCourse);

// Confirm payment
router.put("/confirm/:enrollmentId", enrollmentController.confirmPayment);

// Get user's enrollments
router.get("/my-enrollments", enrollmentController.getUserEnrollments);

// Get course content (after enrollment)
router.get("/course-content/:courseId", enrollmentController.getCourseContent);

// Update video/course progress
router.put("/progress/:enrollmentId", enrollmentController.updateProgress);


// ========== ADMIN ROUTES ==========

// Get all enrollments (Admin)
router.get("/admin/enrollments", enrollmentController.getAllEnrollments);

// Update an enrollment (Admin)
router.put("/admin/enrollments/:id", enrollmentController.updateEnrollment);

// Get enrollment stats (Admin)
router.get("/admin/enrollments/stats", enrollmentController.getEnrollmentStats);

module.exports = router;
