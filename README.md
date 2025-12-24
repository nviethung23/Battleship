# 🚢 BATTLESHIP - Multiplayer Online Game# 🚢 Battleship Multiplayer Game



<div align="center">Game Hải Chiến trực tuyến với WebSocket và WebRTC



![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)## 🎯 Tính năng

![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)- ✅ Đăng ký/Đăng nhập với JWT Authentication

![WebRTC](https://img.shields.io/badge/WebRTC-Video%20Call-333333?style=for-the-badge&logo=webrtc&logoColor=white)- ✅ Game Battleship 2 người chơi real-time

- ✅ Chat real-time

**Game Hải Chiến trực tuyến 2 người chơi với Real-time Communication**- ✅ Voice/Video call (WebRTC)

- ✅ Timer mỗi lượt (60 giây)

[Demo](#-demo) • [Tính năng](#-tính-năng) • [Cài đặt](#-cài-đặt) • [Hướng dẫn](#-hướng-dẫn-chơi) • [Tài liệu](#-tài-liệu-kỹ-thuật)- ✅ Lưu lịch sử trận đấu vào MongoDB

- ✅ Admin Panel (quản lý users, games, statistics)

</div>- ✅ Bảo mật: Rate limiting, Input validation, XSS protection



---## 🚀 Cài đặt



## 📸 Demo### 1. Yêu cầu

- Node.js v16+ 

| Login | Hub | Lobby |- MongoDB Atlas account (free tier)

|:---:|:---:|:---:|

| Đăng nhập/Đăng ký/Guest | Quick Play/Private Room | Chờ đối thủ & Ready |### 2. Clone và cài đặt

```bash

| Ship Deployment | Battle | Game Over |git clone <repository-url>

|:---:|:---:|:---:|cd <repository-url>

| Kéo thả đặt 5 tàu | Bắn và nhận kết quả | Win/Lose với avatar |npm install

```

---

### 3. Cấu hình Environment Variables

## ✨ Tính năng

Tạo file `.env` từ `.env.example`:

### 🎮 Gameplay```bash

- ✅ **Quick Play** - Ghép trận tự động với người chơi ngẫu nhiêncp .env.example .env

- ✅ **Private Room** - Tạo phòng riêng với mã 6 ký tự```

- ✅ **3 Characters** - Chọn nhân vật với avatar win/lose riêng

- ✅ **Drag & Drop** - Kéo thả đặt tàu trực quanChỉnh sửa `.env`:

- ✅ **Turn-based** - Bắn trúng → tiếp tục, Bắn trượt → đổi lượt```env

- ✅ **60s Timer** - Giới hạn thời gian mỗi lượtPORT=3000

NODE_ENV=development

### 💬 CommunicationJWT_SECRET=your-super-secret-jwt-key

- ✅ **Real-time Chat** - Nhắn tin trong trận đấuMONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/battleship?retryWrites=true&w=majority

- ✅ **Video Call** - Gọi video WebRTC với đối thủ```

- ✅ **System Messages** - Thông báo join/leave/ready

**Lưu ý:**

### 🔐 Authentication- `JWT_SECRET`: Tạo random string (dùng lệnh: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

- ✅ **Register/Login** - Tài khoản với JWT- `MONGODB_URI`: Lấy từ MongoDB Atlas dashboard

- ✅ **Guest Mode** - Chơi không cần đăng ký (TTL 24h)

- ✅ **Admin Panel** - Quản lý users, games, statistics### 4. Tạo Admin Account



### 🛡️ Security```bash

- ✅ **Rate Limiting** - Chống brute forcenpm run create-admin

- ✅ **Input Sanitization** - Chống XSS```

- ✅ **Password Hashing** - bcrypt

- ✅ **Security Headers** - HelmetSẽ tạo user `admin` với password `admin123` (nên đổi sau khi đăng nhập)



---## ▶️ Chạy server



## 🏗️ Kiến trúc hệ thống```bash

npm start

``````

┌─────────────────────────────────────────────────────────────────┐

│                         CLIENT                                   │Hoặc chế độ dev (auto-restart):

│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐│```bash

│  │index.html│  │hub.html │  │lobby.html│ │game.html│  │admin.html│npm run dev

│  │ (Auth)  │  │ (Menu)  │  │(Waiting)│  │(Battle) │  │(Admin) ││```

│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └────────┘│

│                          │                                       │## 🌐 Truy cập

│              Socket.IO + REST API + WebRTC                       │

└─────────────────────────────┬───────────────────────────────────┘- **Game**: http://localhost:3000

                              │- **Admin Panel**: http://localhost:3000/admin (cần đăng nhập với admin account)

┌─────────────────────────────▼───────────────────────────────────┐

│                         SERVER                                   │## 📝 Cách chơi

│  ┌──────────────────────────────────────────────────────────┐   │

│  │                    Express.js + Socket.IO                 │   │1. Đăng ký tài khoản (username, password)

│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │2. Đăng nhập

│  │  │ gameHandler │  │ chatHandler │  │webrtcHandler│       │   │3. Tạo phòng hoặc tham gia phòng có sẵn

│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │4. Đặt tàu của bạn (5 tàu) - có thể kéo thả, xoay, hoặc random

│  └──────────────────────────────────────────────────────────┘   │5. Chờ đối thủ sẵn sàng và bắt đầu chơi!

│                              │                                   │6. Click vào ô để bắn

│  ┌──────────────────────────▼───────────────────────────────┐   │7. **Luật chơi**: Bắn trúng → được bắn tiếp, bắn trượt → chuyển lượt

│  │                     MongoDB Atlas                         │   │8. Người phá hủy hết tàu đối thủ trước sẽ thắng!

│  │    users | games | chatmessages | calllogs               │   │

│  └──────────────────────────────────────────────────────────┘   │## 🛠️ Công nghệ

└─────────────────────────────────────────────────────────────────┘

```### Backend

- **Framework**: Node.js + Express

---- **Real-time**: Socket.IO (WebSocket)

- **Database**: MongoDB Atlas (Mongoose)

## 🛠️ Tech Stack- **Authentication**: JWT (JSON Web Tokens)

- **Security**: Helmet, Rate Limiting, Input Validation

| Layer | Technology |

|-------|------------|### Frontend

| **Frontend** | HTML5, CSS3, Vanilla JavaScript |- **HTML/CSS/JavaScript** (Vanilla)

| **Backend** | Node.js 18+, Express.js |- **WebRTC**: Simple-peer (Voice/Video calls)

| **Real-time** | Socket.IO 4.x |- **Charts**: Chart.js (Admin statistics)

| **Video Call** | WebRTC (native) |

| **Database** | MongoDB Atlas (Mongoose ODM) |### Security Features

| **Auth** | JWT (JSON Web Tokens) |- ✅ Rate limiting (chống brute force)

| **Security** | Helmet, bcrypt, Rate Limiting |- ✅ Input sanitization (chống XSS)

- ✅ Password hashing (bcrypt)

---- ✅ JWT authentication

- ✅ Security headers (Helmet)

## 🚀 Cài đặt- ✅ MongoDB injection protection



### Yêu cầu## 👨‍💼 Admin Panel

- **Node.js** v18 trở lên

- **MongoDB Atlas** account (free tier OK)Truy cập `/admin` sau khi đăng nhập với admin account:

- **Git**

- **Dashboard**: Tổng quan thống kê

### Bước 1: Clone repository- **Users**: Quản lý users (xem, xóa, promote/demote admin)

- **Games**: Xem lịch sử trận đấu

```bash- **Statistics**: Thống kê chi tiết

git clone https://github.com/nviethung23/Battleship

cd battleship
## 🔒 Bảo mật

```

- **Rate Limiting**: 

### Bước 2: Cài đặt dependencies  - Auth routes: 5 requests / 15 phút

  - API routes: 100 requests / 15 phút

```bash- **Input Validation**: 

npm install  - Username: 3-20 ký tự, chỉ chữ/số/underscore

```  - Password: 6-100 ký tự, có chữ hoa/thường/số

- **XSS Protection**: Sanitize tất cả user input

### Bước 3: Cấu hình Environment- **MongoDB Injection**: Dùng Mongoose (tự động escape)



Tạo file `.env`:## 📚 Scripts



```env- `npm start` - Chạy server

PORT=3000- `npm run dev` - Chạy server với auto-restart (nodemon)

NODE_ENV=development- `npm run create-admin` - Tạo admin account

JWT_SECRET=your-super-secret-jwt-key-here

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/battleship?retryWrites=true&w=majority## 🐛 Troubleshooting

```

### MongoDB Connection Error

> 💡 **Tạo JWT_SECRET:**- Kiểm tra `MONGODB_URI` trong `.env`

> ```bash- Đảm bảo IP whitelist trong MongoDB Atlas cho phép kết nối

> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

> ```### Port đã được sử dụng

- Đổi `PORT` trong `.env` hoặc kill process đang dùng port 3000

### Bước 4: Tạo Admin Account (Optional)

### Admin panel không hiển thị

```bash- Đảm bảo user có `role: 'admin'` trong MongoDB

npm run create-admin- Đăng nhập lại để có token mới với role

```

> Tạo user `admin` / password `admin123`## 📄 License



### Bước 5: Chạy serverISC



```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

### Bước 6: Truy cập

| URL | Mô tả |
|-----|-------|
| http://localhost:3000 | Game chính |
| http://localhost:3000/admin | Admin Panel |

---

## 🎮 Hướng dẫn chơi

### Flow chơi game

```
1. LOGIN      →  Đăng nhập / Đăng ký / Guest
       ↓
2. HUB        →  Chọn: Quick Play | Create Room | Join Room
       ↓
3. LOBBY      →  Chờ đối thủ, chọn Character, bấm Ready
       ↓
4. DEPLOYMENT →  Kéo thả 5 tàu vào bảng 10x10
       ↓
5. BATTLE     →  Bắn vào bảng đối thủ, 60s/lượt
       ↓
6. GAME OVER  →  Xem kết quả, Back to Hub
```

### Luật chơi

| Tàu | Kích thước |
|-----|------------|
| Carrier | 5 ô |
| Battleship | 4 ô |
| Cruiser | 3 ô |
| Submarine | 3 ô |
| Destroyer | 2 ô |

- **Bắn trúng** → Được bắn tiếp
- **Bắn trượt** → Chuyển lượt đối thủ
- **Phá hủy hết tàu** đối thủ → **Thắng!**

### Phím tắt

| Phím | Chức năng |
|------|-----------|
| `R` | Xoay tàu (khi đặt tàu) |
| `Enter` | Gửi chat |

---

## 📁 Cấu trúc thư mục

```
battleship/
├── client/                     # Frontend
│   ├── index.html              # Login page
│   ├── hub.html                # Main menu
│   ├── lobby.html              # Waiting room
│   ├── game.html               # Game page
│   ├── admin.html              # Admin panel
│   ├── css/
│   │   ├── style.css           # Login styles
│   │   ├── hub.css             # Hub styles
│   │   ├── lobby.css           # Lobby styles
│   │   ├── game.css            # Game styles (deploy + battle)
│   │   └── admin.css           # Admin styles
│   ├── js/
│   │   ├── auth.js             # Login/Register logic
│   │   ├── guestLogin.js       # Guest login
│   │   ├── hub.js              # Hub logic
│   │   ├── lobby.js            # Lobby logic
│   │   ├── game.js             # Game logic (main)
│   │   ├── battle.js           # Battle logic
│   │   ├── chat.js             # Chat logic
│   │   ├── webrtc.js           # Video call
│   │   ├── characters.js       # Character selection
│   │   └── shared/
│   │       ├── socket-shared.js # Socket connection
│   │       └── state.js         # Client state management
│   └── images/
│       └── characters/         # Character avatars
│
├── server/                     # Backend
│   ├── server.js               # Main entry point
│   ├── config/
│   │   ├── database.js         # Database helper
│   │   ├── mongodb.js          # MongoDB connection
│   │   └── guest.js            # Guest TTL config
│   ├── controllers/
│   │   ├── authController.js   # Auth logic
│   │   └── adminController.js  # Admin logic
│   ├── middleware/
│   │   ├── auth.js             # JWT middleware
│   │   ├── admin.js            # Admin check
│   │   ├── validation.js       # Input validation
│   │   └── guestActivity.js    # Guest activity tracking
│   ├── models/
│   │   ├── User.js             # User schema
│   │   ├── Game.js             # Game schema
│   │   ├── ChatMessage.js      # Chat schema (7-day TTL)
│   │   └── CallLog.js          # Call log schema
│   ├── socket/
│   │   ├── gameHandler.js      # Game socket events
│   │   ├── chatHandler.js      # Chat socket events
│   │   └── webrtcHandler.js    # WebRTC signaling
│   └── utils/
│       └── gameLogic.js        # Game rules & validation
│
├── .env                        # Environment variables
├── package.json
└── README.md
```

---

## 📖 Tài liệu kỹ thuật

| File | Mô tả |
|------|-------|
| [SYSTEM_FLOW_ACCURATE.md](SYSTEM_FLOW_ACCURATE.md) | Data Flow Diagram - Socket Events |
| [ACTIVITY_FLOW_DIAGRAM.md](ACTIVITY_FLOW_DIAGRAM.md) | Activity Diagrams - User Flow |
| [DATABASE_SCHEMA_ERD.md](DATABASE_SCHEMA_ERD.md) | ERD - Database Schema (SQL style) |

---

## 🔧 Scripts

| Script | Mô tả |
|--------|-------|
| `npm start` | Chạy server production |
| `npm run dev` | Chạy server với nodemon |
| `npm run create-admin` | Tạo admin account |

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Kiểm tra MONGODB_URI trong .env
Whitelist IP trong MongoDB Atlas Network Access
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Hoặc đổi PORT trong .env
```

### Socket Connection Failed
```
Kiểm tra token trong localStorage/sessionStorage
Đảm bảo server đang chạy
Check browser console for errors
```

### Admin Panel Access Denied
```
Đảm bảo user có role: 'admin' trong database
Đăng nhập lại để refresh token
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

ISC License - see [LICENSE](LICENSE) for details.

---
