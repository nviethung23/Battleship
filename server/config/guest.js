/**
 * Guest Configuration
 * Quản lý TTL và cleanup cho guest accounts
 */

const GUEST_TTL_HOURS = parseInt(process.env.GUEST_TTL_HOURS) || 72;
const GUEST_CLEANUP_INTERVAL_MINUTES = parseInt(process.env.GUEST_CLEANUP_INTERVAL_MINUTES) || 360;

module.exports = {
    GUEST_TTL_HOURS,
    GUEST_CLEANUP_INTERVAL_MINUTES,
    
    /**
     * Tính expiresAt cho guest mới
     */
    getGuestExpiresAt() {
        return new Date(Date.now() + GUEST_TTL_HOURS * 60 * 60 * 1000);
    },
    
    /**
     * Gia hạn expiresAt cho guest đang hoạt động
     */
    extendGuestExpiry() {
        return new Date(Date.now() + GUEST_TTL_HOURS * 60 * 60 * 1000);
    },
    
    /**
     * Kiểm tra guest có hết hạn không
     */
    isGuestExpired(expiresAt) {
        return expiresAt && new Date(expiresAt) < new Date();
    }
};
