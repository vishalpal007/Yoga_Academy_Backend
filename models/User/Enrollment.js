const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    enrolledAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    paymentDetails: {
        status: {
            type: String,
            enum: ['pending', 'paid', 'free', 'failed', 'refunded'],
            default: 'free',
            required: true
        },
        amount: Number,
        transactionId: String,
        paymentMethod: String,
        paymentDate: Date
    },
    access: {
        expiresAt: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    },
    progress: {
        completedVideos: [{
            videoId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course.modules.lessons'
            },
            completedAt: {
                type: Date,
                default: Date.now
            },
            progressPercentage: Number
        }],
        lastAccessed: Date,
        overallCompletion: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    }
}, {
    timestamps: true
});

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

enrollmentSchema.index({ 'paymentDetails.status': 1 });
enrollmentSchema.index({ 'progress.overallCompletion': 1 });
enrollmentSchema.index({ 'access.expiresAt': 1 });



module.exports = mongoose.model('Enrollment', enrollmentSchema);