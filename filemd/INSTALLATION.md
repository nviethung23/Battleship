# 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY

## ✅ Yêu cầu hệ thống

- Node.js phiên bản 16 trở lên
- NPM (đi kèm với Node.js)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)

---

## 📦 BƯỚC 1: Cài đặt Node.js

### Windows:
1. Tải Node.js từ: https://nodejs.org/
2. Chọn phiên bản LTS (Long Term Support)
3. Chạy file cài đặt và làm theo hướng dẫn
4. Khởi động lại máy tính sau khi cài

### Kiểm tra cài đặt:
Mở PowerShell hoặc Command Prompt và chạy:
```bash
node --version
npm --version
```

Nếu hiển thị số phiên bản là OK!

---

## 📁 BƯỚC 2: Mở project trong VS Code

1. Mở VS Code
2. File → Open Folder → Chọn thư mục `DoanLTM`
3. Mở Terminal trong VS Code: View → Terminal hoặc Ctrl + `

---

## 🔧 BƯỚC 3: Tạo file .env

**QUAN TRỌNG:** Bạn cần tự tạo file `.env` vì file này không được push lên git.

1. Trong VS Code, tạo file mới tên `.env` ở thư mục gốc
2. Copy nội dung từ file `.env.example` vào
3. Hoặc gõ trực tiếp:

```
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
NODE_ENV=development
```

4. Lưu file

---

## 📦 BƯỚC 4: Cài đặt dependencies

Trong Terminal của VS Code, chạy lệnh:

```bash
npm install
```

Đợi khoảng 1-2 phút để cài đặt xong tất cả packages.

---

## ▶️ BƯỚC 5: Chạy server

Sau khi cài đặt xong, chạy lệnh:

```bash
npm start
```

Hoặc nếu muốn auto-restart khi có thay đổi:

```bash
npm run dev
```

**Thành công khi thấy:**
```
🚀 Server is running on http://localhost:3000
📦 Environment: development
```

---

## 🌐 BƯỚC 6: Mở trình duyệt

1. Mở trình duyệt (Chrome khuyến nghị)
2. Truy cập: `http://localhost:3000`
3. Bạn sẽ thấy trang đăng nhập!

---

## 🎮 BƯỚC 7: Chơi game

### Để test với 2 người chơi:

**Cách 1: Sử dụng 2 trình duyệt khác nhau**
- Chrome: Tạo user 1
- Firefox/Edge: Tạo user 2

**Cách 2: Sử dụng Chrome Incognito**
- Tab thường: User 1
- Tab ẩn danh (Ctrl + Shift + N): User 2

### Quy trình chơi:

1. **User 1:**
   - Đăng ký tài khoản
   - Đăng nhập
   - Nhấn "Tạo Phòng Mới"
   - Đợi ở màn hình waiting room

2. **User 2:**
   - Đăng ký tài khoản khác
   - Đăng nhập
   - Nhấn "Làm Mới" để xem danh sách phòng
   - Click vào phòng của User 1

3. **Cả 2 user:**
   - Đặt tàu (5 chiếc tàu)
   - Có thể dùng "Đặt Ngẫu Nhiên" để nhanh
   - Nhấn "Sẵn Sàng"

4. **Game bắt đầu:**
   - Lần lượt bắn vào ô của đối thủ
   - Có 60 giây mỗi lượt
   - Chat với đối thủ
   - Gọi video nếu muốn (nhấn nút 📞)

5. **Kết thúc:**
   - Người phá hủy hết tàu đối thủ trước thắng
   - Xem kết quả
   - Quay lại lobby

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "npm not found"
- Cài lại Node.js
- Khởi động lại VS Code

### Lỗi: "Port 3000 already in use"
- Đóng các chương trình đang dùng port 3000
- Hoặc đổi PORT trong file .env thành 3001, 3002...

### Lỗi: "Cannot find module"
- Chạy lại: `npm install`

### Lỗi: "Authentication error" khi connect WebSocket
- Xóa localStorage trong browser: F12 → Application → Local Storage → Clear
- Đăng nhập lại

### Game không kết nối:
- Kiểm tra server có đang chạy không
- F12 → Console xem lỗi gì
- Refresh browser

### Camera/Mic không hoạt động:
- Cho phép browser truy cập camera/mic
- Settings → Privacy → Camera/Microphone

---

## 📊 CẤU TRÚC PROJECT

```
DoanLTM/
├── server/              # Backend code
│   ├── config/          # Database & config
│   ├── controllers/     # Auth logic
│   ├── middleware/      # Auth middleware
│   ├── socket/          # WebSocket handlers
│   ├── utils/           # Game logic
│   └── server.js        # Main server file
├── client/              # Frontend code
│   ├── css/             # Styles
│   ├── js/              # JavaScript
│   ├── index.html       # Login page
│   └── game.html        # Game page
├── data/                # JSON database (auto-created)
├── package.json         # Dependencies
├── .env                 # Environment variables (TỰ TẠO)
└── README.md           # Documentation
```

---

## 🎯 CHECKLIST TRƯỚC KHI DEMO

- [ ] Server chạy được (`npm start`)
- [ ] Truy cập được http://localhost:3000
- [ ] Đăng ký/đăng nhập được
- [ ] Tạo phòng được
- [ ] 2 user join phòng được
- [ ] Đặt tàu được
- [ ] Chơi game được (bắn, hit/miss)
- [ ] Chat hoạt động
- [ ] Timer hoạt động
- [ ] Game over hiển thị đúng
- [ ] Video call hoạt động (nếu có camera/mic)

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, check:
1. Console trong browser (F12)
2. Terminal log của server
3. File log trong data/

Chúc bạn demo thành công! 🎉

