/**
 * Middleware: Update Guest Activity
 * Cập nhật lastSeenAt và gia hạn expiresAt cho guest đang hoạt động
 */

const Database = require('../config/database');
const { extendGuestExpiry } = require('../config/guest');

/**
 * Middleware HTTP: Update lastSeenAt cho guest sau khi authenticated
 */
const updateGuestActivity = async (req, res, next) => {
    // Chỉ áp dụng cho guest
    if (req.user && req.user.isGuest) {
        try {
            await Database.updateGuestActivity(req.user.id);
            // Không cần đợi, chạy background
        } catch (error) {
            console.error('[Guest Activity] Failed to update:', error);
            // Không block request nếu update thất bại
        }
    }
    next();
};

/**
 * Socket Handler: Update lastSeenAt cho guest socket
 */
const updateGuestActivitySocket = async (socket) => {
    if (socket.isGuest && socket.userId) {
        try {
            await Database.updateGuestActivity(socket.userId);
        } catch (error) {
            console.error('[Guest Activity Socket] Failed to update:', error);
        }
    }
};

module.exports = {
    updateGuestActivity,
    updateGuestActivitySocket
};
