# 🚀 AWS EC2 Deployment Guide

## Quick Deploy (5 phút)

### 1. Tạo EC2 Instance
- **AMI**: Amazon Linux 2023 hoặc Ubuntu 22.04
- **Instance type**: t2.micro (free tier) hoặc t3.small
- **Security Group**: Mở port 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (App)

### 2. SSH vào EC2
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 3. Cài đặt Node.js
```bash
# Amazon Linux 2023
sudo dnf install nodejs -y

# Hoặc Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Clone và Setup
```bash
# Clone repo
git clone https://github.com/HoangBinh1612/battleship.git
cd battleship

# Tạo file .env
nano .env
```

Paste nội dung sau vào `.env`:
```
PORT=3000
JWT_SECRET=your_super_secret_key_change_this
MONGODB_URI=mongodb+srv://bs_user:your_password@battleship.h9ctfst.mongodb.net/battleship
GUEST_TTL_HOURS=24
```

### 5. Cài dependencies và chạy
```bash
npm install
npm start
```

### 6. Chạy với PM2 (giữ app chạy liên tục)
```bash
# Cài PM2
sudo npm install -g pm2

# Chạy app
pm2 start server/server.js --name battleship

# Tự động restart khi reboot
pm2 startup
pm2 save
```

### 7. Truy cập game
```
http://your-ec2-ip:3000
```

---

## 🔧 Cấu hình Nginx (Optional - dùng port 80)

```bash
sudo apt install nginx -y  # Ubuntu
# hoặc
sudo dnf install nginx -y  # Amazon Linux

sudo nano /etc/nginx/conf.d/battleship.conf
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 SSL với Let's Encrypt (Optional)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 📋 Checklist Deploy

- [ ] EC2 instance đang chạy
- [ ] Security group mở port 3000 (hoặc 80/443)
- [ ] Node.js đã cài
- [ ] File .env đã tạo với đúng MONGODB_URI
- [ ] PM2 đang chạy app
- [ ] Test truy cập từ browser

---

## 🆘 Troubleshooting

**Lỗi EADDRINUSE (port đang dùng)**
```bash
pm2 kill
pm2 start server/server.js --name battleship
```

**Lỗi MongoDB connection**
- Kiểm tra IP whitelist trong MongoDB Atlas (thêm 0.0.0.0/0 cho tất cả IP)

**App không chạy sau reboot**
```bash
pm2 startup
pm2 save
```
