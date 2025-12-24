# 🔐 HƯỚNG DẪN TẠO ADMIN ĐẦU TIÊN

## Cách 1: Tạo Admin trong MongoDB Atlas (Khuyến nghị)

1. Vào MongoDB Atlas Dashboard
2. Click "Database" → "battleship" cluster
3. Click "Browse Collections"
4. Click vào collection `users`
5. Tìm user bạn muốn làm admin (hoặc tạo user mới trước)
6. Click vào document user đó
7. Sửa field `role` từ `"user"` thành `"admin"`
8. Click "Update"

**Done!** User đó giờ là admin rồi.

---

## Cách 2: Tạo Admin bằng Code (Script)

Tạo file `createAdmin.js` trong thư mục `server/`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const username = 'admin'; // Đổi username bạn muốn
        const password = 'admin123'; // Đổi password bạn muốn
        const email = 'admin@battleship.com';

        // Check if admin exists
        const existing = await User.findOne({ username });
        if (existing) {
            console.log('⚠️ User already exists. Updating to admin...');
            existing.role = 'admin';
            existing.password = await bcrypt.hash(password, 10);
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

        console.log(`\n📋 Admin Credentials:`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`\n⚠️  ĐỔI PASSWORD NGAY SAU KHI ĐĂNG NHẬP!`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createAdmin();
```

Chạy:
```bash
node server/createAdmin.js
```

---

## Cách 3: Promote User hiện tại thành Admin

1. Đăng nhập với user thường
2. Copy `userId` từ token (hoặc xem trong MongoDB)
3. Vào MongoDB Atlas
4. Tìm user đó trong collection `users`
5. Sửa `role: "admin"`
6. Save

---

## ✅ KIỂM TRA ADMIN

Sau khi tạo admin, test:

1. Đăng nhập với admin account
2. Vào: `http://localhost:3000/admin`
3. Nếu thấy dashboard → Thành công! ✅
4. Nếu bị redirect → Check lại role trong MongoDB

---

**Lưu ý:** Admin có thể promote user khác thành admin, nhưng không thể demote chính mình.

