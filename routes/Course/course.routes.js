const express = require('express');
const upload = require('../../middleware/multer');
const router = express.Router();
const courseController = require("../../controller/Course/courseController")

router
    .post('/create', upload.single('thumbnail'), courseController.createCourse);


module.exports = router