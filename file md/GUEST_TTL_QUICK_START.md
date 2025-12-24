# 🎯 Guest TTL System - Quick Start

## Đã thay đổi gì?

### ✅ Auto-delete guest accounts
- Guest tự động bị xóa sau **72 giờ** (configurable)
- Xóa ngay khi logout/disconnect
- Cleanup job chạy mỗi **6 giờ**

### ✅ Activity tracking
- `lastSeenAt`: Cập nhật mỗi khi có hoạt động
- `expiresAt`: Tự động gia hạn khi guest active
- Không xóa guest đang online

### ✅ Match history protection
- Snapshot player info (displayName, isGuest)
- History vẫn hiển thị sau khi guest bị xóa
- Không làm hỏng dữ liệu

---

## 📝 Configuration

```env
# .env
GUEST_TTL_HOURS=72                      # Guest lifetime
GUEST_CLEANUP_INTERVAL_MINUTES=360     # Cleanup frequency
```

---

## 🧪 Test

```bash
# Test TTL system
node server/scripts/testTTL.js
```

---

## 📊 Kết quả

### Trước:
- ❌ Guest tồn tại vô thời hạn
- ❌ Database phình to
- ❌ Không có cleanup

### Sau:
- ✅ Guest auto-delete sau 72h
- ✅ Tiết kiệm ~90% space
- ✅ Cleanup tự động (3 cơ chế)
- ✅ Match history an toàn

---

## 🚀 Cách hoạt động

```
Guest Login → Set expiresAt (+72h)
    ↓
Activity → Update lastSeenAt → Extend expiresAt
    ↓
Disconnect → Delete guest ngay
    ↓
TTL Expired → MongoDB auto-delete
    ↓
Cleanup Job → Backup cleanup (mỗi 6h)
```

---

## ⚠️ Lưu ý

- **KHÔNG thay đổi logic** hiện tại
- **KHÔNG ảnh hưởng** user thật
- **KHÔNG làm hỏng** match history
- MongoDB TTL index tự động tạo khi server start

---

## 📖 Chi tiết

Xem file `GUEST_TTL_IMPLEMENTATION.md` để biết chi tiết đầy đủ.
