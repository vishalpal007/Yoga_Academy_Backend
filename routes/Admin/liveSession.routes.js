const express = require("express");
const router = express.Router();
const liveSessionController = require("../../controller/Admin/liveSessionController");
const { adminProtected } = require("../../middleware/adminProtected");
const upload = require("../../middleware/multer");

router
    .post("/:courseId/go-live", adminProtected, liveSessionController.createLiveSession)
    .post("/:courseId/:sessionId/upload-recording", adminProtected, upload.single("recording"), liveSessionController.createLiveSession)

module.exports = router