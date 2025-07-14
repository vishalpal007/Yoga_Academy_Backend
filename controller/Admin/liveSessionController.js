const asyncHandler = require("express-async-handler");
const Course = require("../../models/Admin/Course");
const cloudinary = require("../../utils/cloudnary");
const fs = require('fs');
const { createZoomMeeting } = require("../../utils/zoomUtils");

exports.createLiveSession = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, dateTime, duration } = req.body;

    if (!title || !dateTime || !duration) {
        res.status(400);
        throw new Error("All fields are required: title, dateTime, duration");
    }

    const course = await Course.findById(courseId).populate("enrolledUsers.user", "name email");

    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    const zoomMeeting = await createZoomMeeting(title, dateTime, duration);

    const newSession = {
        title,
        dateTime: new Date(dateTime),
        duration,
        meetingLink: zoomMeeting.join_url
    };

    course.liveSessions.push(newSession);
    await course.save();

    res.status(201).json({
        success: true,
        message: "Zoom Live Session Created",
        session: newSession
    });
});


exports.uploadRecording = asyncHandler(async (req, res) => {
    const { courseId, sessionId } = req.params;

    if (!req.file) {
        res.status(400);
        throw new Error("Recording file is required");
    }

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    const session = course.liveSessions.id(sessionId);
    if (!session) {
        res.status(404);
        throw new Error("Session not found");
    }

    const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "yoga-recordings",
        resource_type: "video",
    });

    course.recordedVideos.push({
        title: session.title,
        videoUrl: upload.secure_url,
        duration: session.duration,
        uploadedAt: new Date(),
    });

    session.isCompleted = true;

    await course.save();

    fs.unlinkSync(req.file.path);

    res.status(200).json({
        success: true,
        message: "Recording uploaded and linked",
        videoUrl: upload.secure_url,
    });
});