const express = require('express');
const router = express.Router();
const courseController = require("../../controller/Course/courseController")

router
    .get("/", courseController.getAllCourses)
    .get("/:courseId", courseController.getCourse)
    .get("/featured", courseController.getFeaturedCourses)

module.exports = router