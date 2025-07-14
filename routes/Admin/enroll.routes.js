const express = require("express");
const router = express.Router();
const enrollmentController = require("../../controller/User/enrollmentController");

// ========== ADMIN ROUTES ==========

// Get all enrollments (Admin)
router.get("/enrollments", enrollmentController.getAllEnrollments);

// Update an enrollment (Admin)
router.put("/enrollments/:id", enrollmentController.updateEnrollment);

// Get enrollment stats (Admin)
router.get("/enrollments/stats", enrollmentController.getEnrollmentStats);

module.exports = router;
