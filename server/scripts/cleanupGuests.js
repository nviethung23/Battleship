const Database = require('../config/database');

/**
 * Xóa tất cả guest users đã hết hạn (expiresAt < hiện tại)
 * Chạy mỗi giờ tự động
 */
async function cleanupExpiredGuests() {
    try {
        const now = new Date();
        console.log(`[${now.toISOString()}] Bắt đầu cleanup guests hết hạn...`);

        // Lấy tất cả guest hết hạn
        const expiredGuests = await Database.getExpiredGuests();
        
        if (expiredGuests.length === 0) {
            console.log('[Cleanup] Không có guest nào hết hạn');
            return;
        }

        // Xóa từng guest
        for (const guest of expiredGuests) {
            await Database.deleteUserById(guest.id);
            console.log(`[Cleanup] Đã xóa guest: ${guest.guestDisplayName} (${guest.username})`);
        }

        console.log(`[Cleanup] Xóa thành công ${expiredGuests.length} guest hết hạn`);
    } catch (error) {
        console.error('[Cleanup Error]:', error);
    }
}

/**
 * Xóa guest khi user disconnect từ socket
 */
async function deleteGuestOnDisconnect(userId) {
    try {
        const user = await Database.findUserById(userId);
        
        if (user && user.isGuest) {
            await Database.deleteUserById(userId);
            console.log(`[Disconnect] Đã xóa guest: ${user.guestDisplayName}`);
        }
    } catch (error) {
        console.error('[Disconnect Cleanup Error]:', error);
    }
}

module.exports = { cleanupExpiredGuests, deleteGuestOnDisconnect };