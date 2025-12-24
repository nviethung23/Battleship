# Test Deployment Timer & Auto-Ready Features

## Các tính năng đã triển khai:

### 1. ⏱️ Timer Sync khi Refresh
- **Mô tả**: Timer giờ deployment giờ được lưu trong `sessionStorage` và sync khi refresh trang
- **Cách test**:
  1. Vào màn hình deployment (game.html)
  2. Để timer chạy một lúc (ví dụ còn 1:30)
  3. Nhấn F5 để refresh trang
  4. ✅ **Kết quả mong đợi**: Timer tiếp tục từ 1:30 thay vì reset về 2:00

### 2. ✓ Nút Ready hoạt động đầy đủ
- **Mô tả**: Khi nhấn Ready, UI được lock và chuyển trạng thái
- **Cách test**:
  1. Xếp đủ 5 tàu (hoặc nhấn Random Fleet)
  2. Nhấn nút "READY!"
  3. ✅ **Kết quả mong đợi**:
     - Nút đổi thành "WAITING..."
     - Thẻ "YOU" hiển thị trạng thái "Ready!" với icon ✓ màu xanh
     - Nút Random bị disable
     - Nút Reset (↺) bị disable
     - Board không thể kéo thả nữa (opacity 0.8, pointer-events none)
     - Ship Dock bị lock (opacity 0.6, không tương tác được)

### 3. 🤖 Auto Random + Ready khi hết giờ
- **Mô tả**: Khi timer về 00:00 mà chưa Ready, tự động random tàu và Ready
- **Cách test**:
  1. Vào màn hình deployment
  2. **KHÔNG xếp tàu gì cả** hoặc chỉ xếp 1-2 tàu
  3. Đợi timer chạy hết (hoặc sửa `DEPLOYMENT_DURATION` trong game.js từ 120 thành 10 để test nhanh)
  4. ✅ **Kết quả mong đợi**:
     - Khi timer về 00:00, tự động xếp các tàu còn thiếu (random)
     - Sau 0.6 giây, tự động nhấn Ready
     - Hiển thị notification: "Hết giờ! Tự động xếp tàu và sẵn sàng."
     - Thẻ "YOU" chuyển sang trạng thái Ready
     - Nút chuyển thành "WAITING..."

### 4. 🎮 Chuyển sang Game Screen
- **Mô tả**: Khi cả 2 người chơi đều Ready, chuyển sang màn hình chiến đấu với hiệu ứng mượt
- **Cách test**:
  1. Giả lập: Trong `startGame()` (game.js line ~1047), hiện tại có transition logic
  2. Khi server emit `game_started`, sẽ gọi `startGame()`
  3. ✅ **Kết quả mong đợi**:
     - Placement screen fade out (0.5s)
     - Game screen fade in (0.5s)
     - Hiển thị overlay "BATTLE BEGINS!" trong 2 giây
     - Sau đó vào gameplay bình thường

## Code Changes Summary:

### `game.js`:
1. **Timer Sync** (line ~367-421):
   - Dùng `sessionStorage` để lưu `deploymentEndTime`
   - Tính toán lại thời gian còn lại khi refresh
   - Timer dựa trên `Date.now()` thay vì countdown đơn giản

2. **Auto Random + Ready** (line ~428-468):
   - `handleDeploymentTimeout()` kiểm tra nếu chưa ready
   - Gọi `placeRemainingShipsRandomly()`
   - Gọi `sendPlayerReady()` sau 600ms
   - Update UI tương tự như nhấn Ready thủ công

3. **Ready Button Full** (line ~88-131):
   - Lock tất cả controls (Random, Reset, Board, Dock)
   - Update status UI
   - Disable board interactions

4. **Smooth Transition** (line ~1047-1098):
   - Fade out placement screen
   - Fade in game screen
   - Show "BATTLE BEGINS!" overlay
   - Hide overlay sau 2s

### `shipDock.js`:
- Thêm `lockDock()` function để lock ship dock khi ready

### `game.css`:
- Thêm `transition: opacity 0.5s ease-out` cho `.screen`

## Test nhanh (Debug Mode):

Để test nhanh mà không phải đợi 2 phút, sửa dòng sau trong `game.js`:

```javascript
// Line ~369
const DEPLOYMENT_DURATION = 10; // Đổi từ 120 thành 10 giây
```

Sau đó refresh trang, timer sẽ chỉ còn 10 giây thay vì 2 phút.

## Lưu ý khi test với 2 người chơi:

- Để test chuyển sang Game Screen, cần:
  1. Mở 2 trình duyệt/tab (hoặc Incognito)
  2. Login 2 tài khoản khác nhau
  3. Vào cùng 1 room
  4. Cả 2 đều Ready
  5. Server sẽ emit `game_started` event
  6. Cả 2 client sẽ chuyển sang Game Screen

## Troubleshooting:

### Nếu timer không sync khi refresh:
- Kiểm tra Console: có log `[Timer] Synced after refresh: X seconds remaining`
- Kiểm tra `sessionStorage.getItem('deploymentEndTime')` trong DevTools
- Clear cache và thử lại

### Nếu auto-ready không chạy:
- Kiểm tra Console: có log `[Placement] 🤖 Auto-placing remaining ships...`
- Kiểm tra `placeRemainingShipsRandomly()` có chạy không
- Kiểm tra socket connection: `SocketShared.getSocket()` phải return socket instance

### Nếu không chuyển sang Game Screen:
- Kiểm tra server có emit `game_started` event không
- Kiểm tra Console: có log `[Game] 🎮 Starting game with data:`
- Kiểm tra CSS của `#gameScreen` có `display: none` ban đầu không

---

**Ngày tạo**: 2025-12-23
**Phiên bản**: 1.0
**Tác giả**: GitHub Copilot + User
