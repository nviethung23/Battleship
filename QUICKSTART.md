
# ⚡ HƯỚNG DẪN CHẠY NHANH (LOCAL & AWS)


## 📋 CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Đã cài Node.js (kiểm tra: `node --version` trong terminal)
- [ ] Đã mở VS Code vào thư mục battleship
- [ ] Đã đọc hướng dẫn này

---

## 🚀 CÁC BƯỚC THỰC HIỆN


### **BƯỚC 1: TẠO FILE .ENV** ⚠️ (BẮT BUỘC)

1. Trong VS Code, tạo file mới tên `.env` ở thư mục gốc
2. Copy paste vào:
```
PORT=3000
JWT_SECRET=battleship_secret_key_2024
NODE_ENV=development
```
3. Lưu file (Ctrl + S)

### **BƯỚC 2: MỞ TERMINAL**

Trong VS Code: View → Terminal (hoặc Ctrl + `)

### **BƯỚC 3: CÀI ĐẶT**

Chạy lệnh:
```bash
npm install
```
Đợi 1-2 phút.


### **BƯỚC 4: CHẠY SERVER (LOCAL)**

```bash
npm start
```

Thấy dòng này = THÀNH CÔNG:
```
🚀 Server is running on http://localhost:3000
```

### **BƯỚC 5: MỞ BROWSER (LOCAL)**

Truy cập: `http://localhost:3000`

---

## � **CHẠY TRÊN AWS VỚI HTTPS (WebRTC/Camera/Mic)**

### **BƯỚC 1: TẠO HOẶC UPLOAD CERTIFICATE**

**Tạo self-signed cert trên AWS:**
```bash
cd ~/battleship
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=54.206.81.220/O=Battleship Game/C=VN"
```
**Hoặc upload file key.pem, cert.pem từ máy local:**
```powershell
scp -i "C:\Users\ADMIN\Downloads\battleship-key.pem" D:\battleship\key.pem ubuntu@54.206.81.220:~/battleship/
scp -i "C:\Users\ADMIN\Downloads\battleship-key.pem" D:\battleship\cert.pem ubuntu@54.206.81.220:~/battleship/
```

### **BƯỚC 2: SỬA server.js ĐỂ DÙNG HTTPS**
```js
const fs = require('fs');
const https = require('https');
const server = https.createServer({
	key: fs.readFileSync(path.join(__dirname, '../key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '../cert.pem'))
}, app);
```

### **BƯỚC 3: RESTART SERVER**
```bash
pm2 restart battleship
```

### **BƯỚC 4: TRUY CẬP GAME**
- Truy cập: `https://54.206.81.220:3000`
- Nếu trình duyệt cảnh báo, chọn "Advanced" → "Proceed..."

### **LƯU Ý:**
- WebRTC (video call, camera, mic) **chỉ hoạt động trên HTTPS hoặc localhost**
- Self-signed cert sẽ báo "Not Secure" nhưng vẫn dùng được mọi tính năng

---

## �🎮 CÁCH CHƠI THỬ

### Mở 2 trình duyệt:

**TAB 1 (Chrome thường):**
1. Đăng ký user: `player1` / pass: `123456`
2. Đăng nhập
3. Nhấn "Tạo Phòng Mới"
4. Đợi ở màn hình waiting

**TAB 2 (Chrome Incognito - Ctrl+Shift+N):**
1. Đăng ký user: `player2` / pass: `123456`
2. Đăng nhập
3. Click vào phòng của player1

**CẢ 2 TAB:**
1. Nhấn "Đặt Ngẫu Nhiên" để đặt tàu nhanh
2. Nhấn "Sẵn Sàng"
3. Chờ game bắt đầu

**BẮT ĐẦU CHƠI:**
- Lần lượt click vào ô để bắn
- Có 60 giây mỗi lượt
- Chat với nhau
- Thử tính năng video call (nhấn nút 📞)

---

## ❌ LỖI THƯỜNG GẶP

### "Cannot find module"
```bash
npm install
```

### "Port 3000 already in use"
Đổi PORT trong file .env thành 3001

### WebSocket không connect
1. Xóa cache browser (Ctrl + Shift + Delete)
2. Đăng nhập lại


### Camera không hoạt động
- Đảm bảo truy cập qua HTTPS hoặc localhost
- Cho phép browser truy cập camera/mic trong settings

---

## 🎯 TÍNH NĂNG ĐÃ CÓ

✅ Đăng ký/Đăng nhập với JWT
✅ Tạo phòng, join phòng
✅ Đặt tàu (thủ công hoặc random)
✅ Game Battleship hoàn chỉnh
✅ Chat real-time
✅ Timer 60s mỗi lượt

✅ Video/Voice call (WebRTC, chỉ hoạt động trên HTTPS hoặc localhost)
✅ Lưu lịch sử trận đấu
✅ Xử lý disconnect
✅ UI đẹp, responsive

---

## 📞 CẦN HỖ TRỢ?

1. Xem file `INSTALLATION.md` để hướng dẫn chi tiết hơn
2. Check console trong browser (F12)
3. Check terminal log của server


**Chúc bạn thành công! 🎉**

