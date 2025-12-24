require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/mongodb');

async function createAdmin() {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('✅ Connected to MongoDB');

        const username = 'admin';
        const password = 'admin123'; // Default password - user should change this
        const email = 'admin@battleship.com';

        // Check if admin exists
        const existing = await User.findOne({ username });
        
        if (existing) {
            console.log('⚠️  Admin user already exists. Updating to admin role...');
            
            // Update to admin
            existing.role = 'admin';
            if (existing.password !== password) {
                existing.password = await bcrypt.hash(password, 10);
            }
            await existing.save();
            
            console.log('✅ Admin updated successfully!');
        } else {
            // Create new admin
            const hashedPassword = await bcrypt.hash(password, 10);
            const admin = new User({
                username,
                email,
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin created successfully!');
        }

        console.log('\n📋 Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n⚠️  IMPORTANT: Change password after first login!');
        console.log('\n✅ You can now login at: http://localhost:3000');
        console.log('✅ Then go to: http://localhost:3000/admin');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdmin();

