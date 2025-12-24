const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        index: true
    },
    isGuest: {
        type: Boolean,
        default: false,
        index: true
    },
    guestDisplayName: {
        type: String,
        default: null
    },
    lastSeenAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// TTL Index: Tự động xoá guest sau khi hết hạn (expireAfterSeconds = 0)
// MongoDB sẽ check mỗi 60 giây và xoá documents có expiresAt < now
userSchema.index({ expiresAt: 1 }, { 
    expireAfterSeconds: 0,
    partialFilterExpression: { 
        isGuest: true,
        expiresAt: { $exists: true, $ne: null }
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;

