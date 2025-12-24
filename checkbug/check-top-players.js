const mongoose = require('mongoose');
require('dotenv').config();

async function checkTopPlayers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const Game = require('./server/models/Game');
        const User = require('./server/models/User');

        // Get top 10 winners
        const topPlayers = await Game.aggregate([
            { $match: { winnerId: { $ne: null } } },
            { 
                $group: { 
                    _id: '$winnerId', 
                    wins: { $sum: 1 }, 
                    username: { $first: '$winnerUsername' } 
                } 
            },
            { $sort: { wins: -1 } },
            { $limit: 10 }
        ]);

        console.log('📊 Top 10 Winners from Games Collection:');
        console.log('==========================================');
        topPlayers.forEach((player, index) => {
            console.log(`#${index + 1}: ${player.username} (${player._id}) - ${player.wins} wins`);
        });

        // Check if users still exist
        console.log('\n🔍 Checking if users still exist in Users Collection:');
        console.log('======================================================');
        
        for (const player of topPlayers) {
            const user = await User.findById(player._id);
            if (user) {
                console.log(`✅ ${player.username} - STILL EXISTS (isGuest: ${user.isGuest})`);
            } else {
                console.log(`❌ ${player.username} (${player._id}) - DELETED (was guest, expired)`);
            }
        }

        // Count total games with deleted winners
        const allGames = await Game.find({ winnerId: { $ne: null } }).lean();
        let deletedWinners = 0;
        
        for (const game of allGames) {
            const user = await User.findById(game.winnerId);
            if (!user) {
                deletedWinners++;
            }
        }

        console.log(`\n📈 Summary:`);
        console.log(`Total games with winner: ${allGames.length}`);
        console.log(`Games with deleted winner: ${deletedWinners}`);
        console.log(`Games with existing winner: ${allGames.length - deletedWinners}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTopPlayers();
