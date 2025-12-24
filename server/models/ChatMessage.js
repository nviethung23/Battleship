const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
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
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    isGuest: {
        type: Boolean,
        default: false
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    messageType: {
        type: String,
        enum: ['text', 'system', 'emoji'],
        default: 'text'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for faster queries
chatMessageSchema.index({ roomId: 1, timestamp: -1 });
chatMessageSchema.index({ userId: 1 });
chatMessageSchema.index({ gameId: 1 });

// Auto-delete messages older than 7 days
chatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
