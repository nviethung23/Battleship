# 🚢 Battleship Multiplayer Online Game

Game Hải Chiến 2 người chơi, realtime trên web: **Quick Play / Private Room**, **chat realtime**, hỗ trợ **voice/video call (WebRTC)**, lưu lịch sử trận đấu vào **MongoDB**, có **Admin Panel**.

---

## Mục lục
- [Demo](#demo)
- [Tính năng](#tính-năng)
- [Tech Stack](#tech-stack)
- [Cài đặt nhanh (Local)](#cài-đặt-nhanh-local)
- [Cấu hình .env](#cấu-hình-env)
- [Scripts](#scripts)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Hướng dẫn chơi](#hướng-dẫn-chơi)
- [Admin Panel](#admin-panel)
- [Deploy (gợi ý)](#deploy-gợi-ý)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Tài liệu kỹ thuật](#tài-liệu-kỹ-thuật)
- [Đóng góp](#đóng-góp)
- [License](#license)

---

## Demo
- Local: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

> Bạn có thể thêm screenshot/gif vào đây sau (ví dụ: `./filemd/...`).

---

## Tính năng

### 🎮 Gameplay
- ✅ Quick Play: ghép trận tự động
- ✅ Private Room: tạo/join phòng bằng mã
- ✅ Chọn nhân vật/skin (tuỳ cấu hình project)
- ✅ Đặt tàu kéo-thả (drag & drop), xoay, random, reset
- ✅ Turn-based: bắn trúng bắn tiếp, trượt đổi lượt
- ✅ Timer mỗi lượt (mặc định 60s)

### 💬 Realtime & Communication
- ✅ Realtime sync bằng Socket.IO (WebSocket)
- ✅ Chat realtime trong trận
- ✅ Voice/Video call bằng WebRTC (signaling qua Socket.IO)

### 🧠 Data & Admin
- ✅ Lưu lịch sử trận đấu vào MongoDB
- ✅ Admin Panel: quản lý users/games/thống kê, phân quyền admin

### 🔒 Security (mức cơ bản)
- ✅ JWT Auth
- ✅ Rate limiting / input validation / hardening (tuỳ cấu hình server)

---

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML/CSS/JS (Vanilla)
- **Database**: MongoDB (Atlas)
- **Auth**: JWT
- **Realtime**: Socket.IO (WebSocket)
- **Voice/Video**: WebRTC

---

## Cài đặt nhanh (Local)

### 1) Yêu cầu
- Node.js **18+**
- MongoDB Atlas (free tier OK)

### 2) Clone & cài dependencies
```bash
git clone https://github.com/nviethung23/Battleship
cd Battleship
npm install
```

### 3) Tạo file `.env`
```bash
cp .env.example .env
```

### 4) Chạy project
```bash
# Dev
npm run dev

# Prod
npm start
```

---

## Cấu hình .env
Mở `.env` và cập nhật tối thiểu:
```env
PORT=3000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
```

Gợi ý generate secret nhanh:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Scripts
(Tùy theo `package.json` của repo, thường sẽ có các lệnh sau)
- `npm start` — chạy production
- `npm run dev` — chạy dev (auto-restart)
- `npm run create-admin` — tạo tài khoản admin (nếu project có script này)

---

## Cấu trúc thư mục
```txt
Battleship/
├─ client/          # Frontend (HTML/CSS/JS/assets)
├─ server/          # Backend (Express/Socket.IO/api)
├─ public/          # Static public (fonts/assets nếu có)
├─ filemd/          # Tài liệu/ảnh minh hoạ (tuỳ repo)
├─ .env.example
├─ CREATE_ADMIN.md
├─ QUICKSTART.md
├─ package.json
└─ README.md
```

---

## Hướng dẫn chơi
1. **Login / Register** hoặc **Guest**
2. Vào **Hub** → chọn **Quick Play** hoặc **Create/Join Room**
3. Vào **Lobby** → chọn character (nếu có) → **Ready**
4. **Deploy**: đặt 5 tàu (kéo thả, xoay, random)
5. **Battle**: bắn theo lượt  
   - Trúng → tiếp tục  
   - Trượt → đổi lượt
6. Kết thúc: **Win/Lose**, xem lại lịch sử (nếu có UI)

**Luật tàu chuẩn**:
- Carrier: 5 ô
- Battleship: 4 ô
- Cruiser: 3 ô
- Submarine: 3 ô
- Destroyer: 2 ô

---

## Admin Panel
- Truy cập: `/admin`
- Cần đăng nhập user có role/admin.
- Tham khảo hướng dẫn chi tiết tại `CREATE_ADMIN.md`.

---

## Deploy (gợi ý)
Một flow deploy phổ biến (EC2 + PM2):

1) SSH vào server, pull code, cài deps:
```bash
git pull
npm ci --omit=dev || npm install
```

2) Set `.env` production, rồi chạy PM2:
```bash
pm2 start <entry> --name battleship
pm2 save
pm2 status
pm2 logs battleship --lines 200
```

3) (Khuyến nghị) Dùng Nginx reverse proxy + HTTPS (Let’s Encrypt / ACM).

---

## Troubleshooting
- **MongoDB connection lỗi**
  - Check `MONGODB_URI`
  - Atlas: whitelist IP / mở đúng Network Access
- **Port đã bị chiếm**
  - đổi `PORT` hoặc stop process đang giữ port
- **Socket connect fail**
  - check server chạy chưa, check CORS, check token/JWT, check console browser
- **Admin bị chặn**
  - user phải có role admin, logout/login lại để refresh token/role

---

## Security Notes
- **Không commit cert/key**: `cert.pem`, `key.pem` nên nằm ngoài repo (hoặc secret store).
- Nếu lỡ commit public: **rotate/re-issue certificate và key ngay**.
- Trên server: set permission cho private key:
  ```bash
  chmod 600 key.pem
  ```

---

## Tài liệu kỹ thuật
- `SYSTEM_FLOW_ACCURATE.md` — Socket events / data flow
- `ACTIVITY_FLOW_DIAGRAM.md` — activity/user flow
- `DATABASE_SCHEMA_ERD.md` — ERD/schema

---

## Đóng góp
1. Fork repo
2. Tạo branch (`git checkout -b feature/<ten>`)
3. Commit & push
4. Mở Pull Request

---

## License
ISC — xem `LICENSE`.
