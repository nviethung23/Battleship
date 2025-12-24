# 🎨 Hướng Dẫn Thay Đổi Logo

## 📁 Nơi đặt file logo:

### **Option 1: Đặt trực tiếp (Khuyên dùng)**
```
d:\battleship\client\images\logo.png
```

### **Option 2: Tạo thư mục riêng**
```
d:\battleship\client\images\logos\logo.png
```
(Nếu dùng option này, nhớ đổi path trong HTML từ `images/logo.png` thành `images/logos/logo.png`)

---

## ✅ Đã thay đổi các file:

### 1. **HTML Files:**
- ✅ `client/index.html` - Login page
- ✅ `client/game.html` - Game page
- ✅ `client/admin.html` - Admin page

### 2. **CSS Files:**
- ✅ `client/css/style.css` - Logo styling cho login
- ✅ `client/css/game.css` - Logo styling cho header game
- ✅ `client/css/admin.css` - Logo styling cho admin sidebar

---

## 🎨 Kích thước logo được sử dụng:

- **Login Page**: 120x120px (có animation float)
- **Game Header**: 50x50px (nhỏ gọn)
- **Admin Sidebar**: 80x80px (có drop-shadow)
- **Favicon** (tab icon): Tự động resize

---

## 🔧 Cách sử dụng:

### **Bước 1: Lưu logo**
1. Lưu file logo của bạn với tên `logo.png`
2. Copy vào thư mục: `d:\battleship\client\images\`

### **Bước 2: Định dạng file**
- **PNG** (khuyên dùng) - Có background trong suốt
- **JPG** - Nếu có background
- **SVG** - Vector, chất lượng tốt nhất

### **Bước 3: Tối ưu kích thước**
- Logo gốc nên có kích thước tối thiểu: **256x256px**
- File size: Dưới **100KB** để load nhanh

### **Bước 4: Restart server & test**
```bash
npm start
```

---

## 🎭 Các hiệu ứng đã thêm:

### **Login Page:**
- ✨ **Float animation**: Logo bay nhẹ lên xuống
- 🔄 Smooth transitions

### **Game Header:**
- 🎯 Logo nhỏ gọn bên cạnh title
- 📱 Responsive design

### **Admin Sidebar:**
- 💎 Drop shadow effect
- 🎨 Căn giữa với spacing đẹp

---

## 📝 Nếu muốn thay đổi thêm:

### **Đổi kích thước logo trong Login:**
```css
/* client/css/style.css */
.game-logo {
    width: 150px;    /* Thay đổi ở đây */
    height: 150px;   /* Thay đổi ở đây */
}
```

### **Đổi kích thước logo trong Game Header:**
```css
/* client/css/game.css */
.header-logo-img {
    width: 60px;     /* Thay đổi ở đây */
    height: 60px;    /* Thay đổi ở đây */
}
```

### **Đổi kích thước logo trong Admin:**
```css
/* client/css/admin.css */
.admin-logo {
    width: 100px;    /* Thay đổi ở đây */
    height: 100px;   /* Thay đổi ở đây */
}
```

---

## 🛠️ Troubleshooting:

### Logo không hiển thị?
1. **Kiểm tra path**: Đảm bảo file ở đúng `client/images/logo.png`
2. **Kiểm tra tên file**: Phải đúng là `logo.png` (lowercase)
3. **Clear cache**: Ctrl+Shift+R hoặc Ctrl+F5
4. **Check console**: F12 → Console tab xem có lỗi không

### Logo bị vỡ/mờ?
- Dùng file PNG với resolution cao (ít nhất 256x256px)
- Hoặc dùng SVG để luôn sắc nét

### Logo quá to/quá nhỏ?
- Chỉnh lại trong CSS theo hướng dẫn ở trên

---

## 🎉 Kết quả:

- ✅ Logo hiển thị ở trang Login
- ✅ Logo hiển thị ở header Game
- ✅ Logo hiển thị ở sidebar Admin
- ✅ Favicon hiển thị ở tab browser
- ✅ Có animation & effects đẹp
- ✅ Responsive trên mọi thiết bị

---

## 📸 Vị trí logo trên các trang:

### **Login (index.html):**
```
┌─────────────────────┐
│                     │
│      🎨 LOGO        │  ← Ở giữa, to, có animation
│                     │
│   Battleship Game   │
│                     │
│   [Login Form]      │
└─────────────────────┘
```

### **Game (game.html):**
```
┌─────────────────────────────────────┐
│ 🎨 Battleship Game    [User] [Logout] │  ← Header
└─────────────────────────────────────┘
```

### **Admin (admin.html):**
```
┌──────────┐
│          │
│  🎨 Logo │  ← Sidebar trên cùng
│          │
│  Admin   │
│          │
│ [Menu]   │
└──────────┘
```

---

**🎨 Chúc bạn có logo đẹp!**
