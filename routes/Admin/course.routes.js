const express = require('express');
const upload = require('../../middleware/multer');
const router = express.Router();
const courseController = require("../../controller/Course/courseController")

router
    .post('/create', upload.single('thumbnail'), courseController.createCourse)
    .put('/update/:courseId', upload.single('thumbnail'), courseController.updateCourse)
    .delete('/delete/:courseId', upload.single('thumbnail'), courseController.deleteCourse)
    .get('/stats', courseController.getCourseStats)
    .patch('/:courseId/toggle-feature', courseController.getCourseStats)

module.exports = router