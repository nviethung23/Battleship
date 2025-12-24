/**
 * Test script để kiểm tra TTL và cleanup hoạt động
 */

const { connectDB } = require('../config/mongodb');
const Database = require('../config/database');
const { GUEST_TTL_HOURS } = require('../config/guest');

async function testTTL() {
    try {
        console.log('🧪 Testing Guest TTL System...\n');

        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // 1. Đếm số guest hiện tại
        const currentCount = await Database.countGuests();
        console.log(`📊 Current guest count: ${currentCount}`);

        // 2. Tạo 3 guest test
        console.log('\n🔨 Creating 3 test guests...');
        
        const testGuests = [];
        for (let i = 1; i <= 3; i++) {
            const timestamp = Date.now() + i;
            const guest = await Database.createUser({
                username: `test_guest_${timestamp}`,
                email: `test_${timestamp}@guest.local`,
                password: 'test_password',
                isGuest: true,
                guestDisplayName: `Test Guest ${i}`,
                lastSeenAt: new Date(),
                createdAt: new Date(),
                // Guest 1: hết hạn 1 phút trước (để test cleanup)
                // Guest 2: hết hạn 1 giờ sau (còn hạn)
                // Guest 3: hết hạn theo TTL config (bình thường)
                expiresAt: i === 1 
                    ? new Date(Date.now() - 60 * 1000) // Đã hết hạn
                    : i === 2 
                    ? new Date(Date.now() + 60 * 60 * 1000) // Còn 1 giờ
                    : new Date(Date.now() + GUEST_TTL_HOURS * 60 * 60 * 1000) // TTL config
            });
            
            testGuests.push(guest);
            console.log(`  ✅ Created: ${guest.username} (expires: ${guest.expiresAt})`);
        }

        // 3. Kiểm tra số guest sau khi tạo
        const afterCreate = await Database.countGuests();
        console.log(`\n📊 Guest count after creation: ${afterCreate}`);

        // 4. Lấy danh sách expired guests
        const expiredGuests = await Database.getExpiredGuests();
        console.log(`\n⏰ Expired guests found: ${expiredGuests.length}`);
        expiredGuests.forEach(g => {
            console.log(`  ❌ ${g.username} (expired: ${g.expiresAt})`);
        });

        // 5. Test update activity
        console.log(`\n🔄 Testing updateGuestActivity for test_guest_1...`);
        const updated = await Database.updateGuestActivity(testGuests[0].id);
        console.log(`  ${updated ? '✅' : '❌'} Update activity: ${updated ? 'success' : 'failed'}`);

        // 6. Kiểm tra guest sau update
        const guestAfterUpdate = await Database.findUserById(testGuests[0].id);
        if (guestAfterUpdate) {
            console.log(`  📝 New lastSeenAt: ${guestAfterUpdate.lastSeenAt}`);
            console.log(`  📝 New expiresAt: ${guestAfterUpdate.expiresAt}`);
        }

        // 7. Cleanup expired guests
        console.log(`\n🧹 Running cleanup for expired guests...`);
        const { cleanupExpiredGuests } = require('../scripts/cleanupGuests');
        await cleanupExpiredGuests();

        // 8. Kiểm tra số guest sau cleanup
        const afterCleanup = await Database.countGuests();
        console.log(`\n📊 Guest count after cleanup: ${afterCleanup}`);

        // 9. Xóa guests test còn lại
        console.log(`\n🗑️  Cleaning up test guests...`);
        for (const guest of testGuests) {
            try {
                await Database.deleteUserById(guest.id);
                console.log(`  ✅ Deleted: ${guest.username}`);
            } catch (error) {
                console.log(`  ⚠️  Could not delete: ${guest.username} (might be already deleted)`);
            }
        }

        // 10. Final count
        const finalCount = await Database.countGuests();
        console.log(`\n📊 Final guest count: ${finalCount}`);

        console.log('\n✅ TTL Test completed successfully!');
        console.log(`\n📋 Summary:`);
        console.log(`   - Guest TTL: ${GUEST_TTL_HOURS} hours`);
        console.log(`   - TTL Index: MongoDB will auto-delete expired guests`);
        console.log(`   - Manual cleanup: Also runs periodically on server`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test
testTTL();
