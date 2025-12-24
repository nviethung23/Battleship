# Background Images Guide

## 📁 Cấu trúc folder:

Đặt ảnh nền vào folder này:

```
client/images/backgrounds/
├── lobby-bg.jpg                    ← Ảnh nền cho Lobby Screen
├── character-selection-bg.jpg      ← Ảnh nền cho Character Selection Screen
├── game-bg.jpg                     ← Ảnh nền cho Game Screen
└── game-over-bg.jpg                ← Ảnh nền cho Game Over Screen
```

## 📐 Kích thước ảnh đề xuất:

- **Resolution**: 1920x1080 (Full HD) hoặc 2560x1440 (2K)
- **Format**: JPG hoặc PNG
- **File size**: < 2MB mỗi ảnh (để load nhanh)
- **Aspect ratio**: 16:9 (landscape)

## 🎨 Lưu ý:

- Ảnh nền sẽ được cover toàn màn hình
- Có overlay tối 30% để content dễ đọc hơn
- Nếu chưa có ảnh, sẽ hiển thị gradient mặc định

## 📝 Cách thêm ảnh:

1. Đặt ảnh vào folder `client/images/backgrounds/`
2. Đặt tên đúng:
   - `lobby-bg.jpg` cho Lobby
   - `character-selection-bg.jpg` cho Character Selection
   - `game-bg.jpg` cho Game Screen
   - `game-over-bg.jpg` cho Game Over
3. Refresh browser để thấy ảnh nền

## 💡 Tips:

- Nên dùng ảnh có độ tương phản thấp để content dễ đọc
- Có thể điều chỉnh độ tối của overlay trong CSS (dòng `background: rgba(0, 0, 0, 0.3)`)
- Nếu muốn ảnh sáng hơn, giảm số `0.3` xuống (ví dụ: `0.2` = 20% tối)
- Nếu muốn ảnh tối hơn, tăng số lên (ví dụ: `0.5` = 50% tối)

