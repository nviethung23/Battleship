# 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY

## ✅ Yêu cầu hệ thống

- Node.js phiên bản 16 trở lên
- NPM (đi kèm với Node.js)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)

---

# Battleship Game – Installation & Deployment Guide

## 🚀 System Requirements

- **Node.js** v16.x or v18.x (recommended)
- **npm** v8.x or higher
- **Git**
- **MongoDB Atlas** (cloud database)
- **PM2** (recommended for production)

---

## 1. Clone the Project

```bash
git clone <your-repo-url>
cd battleship
```

---

## 2. Install Node.js & Git (if needed)

- Download Node.js: https://nodejs.org/en/download
- Download Git: https://git-scm.com/downloads
- Check installation:
  ```bash
  node -v
  npm -v
  git --version
  ```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root with the following content:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/battleship?retryWrites=true&w=majority
SESSION_SECRET=your_secret
SSL_KEY_PATH=./key.pem
SSL_CERT_PATH=./cert.pem
```

**Notes:**
- For local development, SSL is optional. For production (AWS), HTTPS is recommended.
- If you use HTTPS, generate self-signed certs or use a real certificate.

---

## 4. (Optional) Generate Self-Signed SSL Certificates

If you want to enable HTTPS locally or on your server:

```bash
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem
```
Place `key.pem` and `cert.pem` in the project root.

---

## 5. Install Dependencies

```bash
npm install
```

---

## 6. Start the Server

**Development:**
```bash
npm run dev
```

**Production (recommended):**
```bash
pm2 start server/server.js --name battleship
```

**If successful, you should see:**
```
🚀 Server is running on http://localhost:3000
📦 Environment: development
```

---

## 7. Access the App

1. Open your browser (Chrome recommended)
2. Go to: `http://localhost:3000` (or your server's public IP/domain)
3. You should see the login page!

---

## 8. Play & Test (2 Players)

**Option 1:** Use two different browsers (e.g., Chrome + Firefox)
**Option 2:** Use Chrome normal + Incognito window

**Game Flow:**
1. Register and log in as User 1
2. Register and log in as User 2 (different browser or incognito)
3. User 1: Create a new room, wait in lobby
4. User 2: Refresh/join User 1's room
5. Both: Place ships (can use "Randomize") and click "Ready"
6. Game starts: Take turns firing, chat, use video call (if desired)
7. Winner: First to destroy all opponent's ships

---

## 9. Common Issues & Troubleshooting

- **npm not found:** Reinstall Node.js, restart terminal/VS Code
- **Port 3000 already in use:** Close other apps using 3000, or change `PORT` in `.env`
- **Cannot find module:** Run `npm install` again
- **WebSocket authentication error:** Clear browser localStorage (F12 → Application → Local Storage → Clear), re-login
- **Game not connecting:** Ensure server is running, check browser console (F12), refresh page
- **Camera/Mic not working:** Allow browser access, check OS privacy settings

---

## 10. Project Structure

```
battleship/
├── server/              # Backend (Express, Socket.IO, WebRTC)
│   ├── config/          # Database/config files
│   ├── controllers/     # Auth/admin logic
│   ├── middleware/      # Auth/validation middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts
│   ├── socket/          # WebSocket handlers
│   ├── utils/           # Game logic
│   └── server.js        # Main server entry
├── client/              # Frontend (HTML/CSS/JS)
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JS
│   ├── images/          # Game assets
│   ├── index.html       # Login page
│   ├── game.html        # Game page
│   ├── hub.html         # Hub/lobby
│   └── ...
├── public/              # Public assets (fonts, etc.)
├── package.json         # Project dependencies
├── .env                 # Environment variables (create yourself)
└── README.md            # Main documentation
```

---

## 11. Pre-Demo Checklist

- [ ] Server runs (`npm start` or PM2)
- [ ] Can access app in browser
- [ ] Register/login works
- [ ] Room creation/join works
- [ ] Ship placement works
- [ ] Game logic (fire, hit/miss) works
- [ ] Chat works
- [ ] Timer works
- [ ] Game over screen correct
- [ ] Video call works (if camera/mic available)

---

## 12. Support

If you have issues:
1. Check browser console (F12)
2. Check server terminal logs
3. Check logs in `data/` (if available)

Good luck and happy demo! 🎉
```


