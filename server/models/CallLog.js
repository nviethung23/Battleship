const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        default: null
    },
    callerId: {
        type: String,
        required: true
    },
    callerUsername: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    receiverUsername: {
        type: String,
        required: true
    },
    callType: {
        type: String,
        enum: ['video', 'audio'],
        default: 'video'
    },
    status: {
        type: String,
        enum: ['initiated', 'accepted', 'rejected', 'ended', 'missed', 'failed'],
        default: 'initiated'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    answeredAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // seconds
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
callLogSchema.index({ roomId: 1, startedAt: -1 });
callLogSchema.index({ callerId: 1 });
callLogSchema.index({ receiverId: 1 });

// Auto-delete logs older than 30 days
callLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const CallLog = mongoose.model('CallLog', callLogSchema);

module.exports = CallLog;
