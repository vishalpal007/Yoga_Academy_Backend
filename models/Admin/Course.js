const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dateTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    meetingLink: { type: String, required: true },
    isLive: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    recordingUrl: { type: String },
    reminderSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    videoUrl: { type: String, required: true },
    duration: Number,
    uploadedAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    category: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'therapy', 'meditation'],
        default: 'beginner'
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    duration: { type: Number, required: true }, // in days
    isFree: { type: Boolean, default: true },
    price: {
        type: Number,
        default: 0,
        validate: {
            validator: function () {
                return this.isFree || this.price > 0;
            },
            message: 'Price must be set for paid courses'
        }
    },

    liveSessions: [liveSessionSchema],   // ⬅️ Will be added later
    recordedVideos: [videoSchema],       // ⬅️ Will be added later

    enrolledUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        paymentStatus: {
            type: String,
            enum: ['paid', 'free'],
            default: 'free'
        },
        enrolledAt: { type: Date, default: Date.now }
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: Date
});

courseSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    if (this.isFree) this.price = 0;
    next();
});

module.exports = mongoose.model('Course', courseSchema);
