require('dotenv').config();
const mongoose = require('mongoose');

async function checkMongoDBData() {
    try {
        console.log('🔗 Đang kết nối MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Kết nối thành công!\n');

        // Lấy database name
        const dbName = mongoose.connection.db.databaseName;
        console.log(`📦 Database: ${dbName}\n`);

        // Lấy danh sách collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📂 Có ${collections.length} collections:\n`);

        for (const collection of collections) {
            const collName = collection.name;
            const count = await mongoose.connection.db.collection(collName).countDocuments();
            console.log(`   ├─ ${collName}: ${count} documents`);

            // Nếu là users collection, hiển thị chi tiết
            if (collName === 'users') {
                const users = await mongoose.connection.db.collection(collName)
                    .find({})
                    .project({ username: 1, displayName: 1, isGuest: 1, createdAt: 1 })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .toArray();
                
                console.log('\n   👤 10 users mới nhất:');
                users.forEach((user, index) => {
                    const type = user.isGuest ? '[GUEST]' : '[USER] ';
                    const date = user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : 'N/A';
                    console.log(`      ${index + 1}. ${type} ${user.username} (${user.displayName}) - ${date}`);
                });
            }

            // Nếu là games collection, hiển thị chi tiết
            if (collName === 'games') {
                const games = await mongoose.connection.db.collection(collName)
                    .find({})
                    .project({ player1: 1, player2: 1, status: 1, createdAt: 1 })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .toArray();
                
                console.log('\n   🎮 5 games mới nhất:');
                games.forEach((game, index) => {
                    const date = game.createdAt ? new Date(game.createdAt).toLocaleString('vi-VN') : 'N/A';
                    console.log(`      ${index + 1}. ${game.player1} vs ${game.player2} [${game.status}] - ${date}`);
                });
            }

            console.log('');
        }

        // Kiểm tra user vừa đăng ký
        console.log('\n🔍 Kiểm tra user "toilahung":');
        const testUser = await mongoose.connection.db.collection('users')
            .findOne({ username: 'toilahung' });
        
        if (testUser) {
            console.log('   ✅ Tìm thấy user!');
            console.log(`   📝 Username: ${testUser.username}`);
            console.log(`   👤 Display Name: ${testUser.displayName}`);
            console.log(`   📧 Email: ${testUser.email || 'N/A'}`);
            console.log(`   🎭 Character: ${testUser.selectedCharacter || 'N/A'}`);
            console.log(`   📅 Created: ${testUser.createdAt ? new Date(testUser.createdAt).toLocaleString('vi-VN') : 'N/A'}`);
            console.log(`   🎯 Is Guest: ${testUser.isGuest || false}`);
        } else {
            console.log('   ❌ Không tìm thấy user!');
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Đã đóng kết nối MongoDB');
    }
}

checkMongoDBData();
