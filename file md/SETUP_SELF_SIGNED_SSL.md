# HƯỚNG DẪN SETUP SELF-SIGNED SSL (MIỄN PHÍ)

## Bước 1: Tạo SSL Certificate trên AWS

```bash
# SSH vào server
ssh -i "C:\Users\ADMIN\Downloads\battleship-key.pem" ubuntu@54.206.81.220

# Tạo thư mục ssl
mkdir -p ~/battleship/ssl
cd ~/battleship/ssl

# Generate private key và certificate (valid 1 năm)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=VN/ST=HCM/L=HoChiMinh/O=Battleship/CN=54.206.81.220"

# Check files
ls -la
# Kết quả:
# cert.pem (public certificate)
# key.pem (private key)
```

---

## Bước 2: Sửa server.js để dùng HTTPS

```javascript
// Thêm vào đầu file server.js
const https = require('https');
const fs = require('fs');

// ... (code cũ)

// Thay vì:
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => { ... });

// Dùng:
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = 3443; // Port HTTPS

// HTTP server (redirect to HTTPS)
const httpApp = express();
httpApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}:${HTTPS_PORT}${req.url}`);
});
httpApp.listen(PORT, () => {
    console.log(`✓ HTTP server running on port ${PORT} (redirect to HTTPS)`);
});

// HTTPS server
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'))
};

const httpsServer = https.createServer(sslOptions, app);
const io = new Server(httpsServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS server running on port ${HTTPS_PORT}`);
});
```

---

## Bước 3: Mở port HTTPS trên AWS

1. Vào AWS Console → EC2 → Security Groups
2. Edit Inbound Rules
3. Add Rule:
   - Type: **Custom TCP**
   - Port: **3443**
   - Source: **0.0.0.0/0** (Anywhere)
4. Save

---

## Bước 4: Restart server

```bash
pm2 restart battleship
pm2 logs battleship
```

---

## Bước 5: Truy cập

```
https://54.206.81.220:3443
```

**Lưu ý:** Browser sẽ cảnh báo "Not Secure" vì self-signed.

**Bypass:**
1. Chrome: Click "Advanced" → "Proceed to 54.206.81.220 (unsafe)"
2. Firefox: "Advanced" → "Accept the Risk and Continue"

---

## ✅ KẾT QUẢ:

- ✅ HTTPS hoạt động
- ✅ Dữ liệu được mã hóa
- ✅ WebRTC hoạt động tốt hơn
- ⚠️ Browser cảnh báo (chấp nhận được cho demo)

---

## 🔄 HTTP vs HTTPS:

```
HTTP:  http://54.206.81.220:3000  (cũ)
HTTPS: https://54.206.81.220:3443 (mới)
```

---

## 📝 LƯU Ý:

1. Self-signed SSL **CHỈ** dùng cho:
   - Demo nội bộ
   - Testing
   - Development

2. Nếu muốn public thực sự:
   - Dùng Cloudflare (free)
   - Hoặc mua domain + Let's Encrypt

---

**Chi phí:** $0  
**Thời gian:** 5 phút  
**Bảo mật:** ✅ (mã hóa) nhưng không trusted
