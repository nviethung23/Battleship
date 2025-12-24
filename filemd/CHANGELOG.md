# 📝 CHANGELOG - Lịch Sử Thay Đổi

## Version 1.1.0 - Sửa Logic Game (20/12/2024)

### 🔧 **BUG FIX: Logic lượt chơi sai**

**Vấn đề:** 
- Trước đây, sau mỗi lượt bắn đều chuyển lượt cho đối thủ, bất kể bắn trúng hay trượt
- Đây là SAI với luật chơi Battleship truyền thống

**Luật chơi đúng:**
- ✅ **Bắn TRÚNG** → Được bắn tiếp
- ✅ **Bắn TRƯỢT** → Chuyển lượt cho đối thủ

### 📋 **Files đã sửa:**

#### 1. `server/socket/gameHandler.js`
**Thay đổi:** Sửa hàm `attack()` (dòng 205-234)
- **TRƯỚC:** Luôn chuyển lượt sau mỗi lần bắn
- **SAU:** 
  - Nếu `hit = false` (trượt) → Chuyển lượt
  - Nếu `hit = true` (trúng) → Giữ nguyên lượt, emit event `turn_continue`

```javascript
// Logic mới:
if (!result.hit) {
    // Bắn trượt → chuyển lượt
    game.currentTurn = defender.userId;
    this.io.to(roomId).emit('turn_changed', {...});
} else {
    // Bắn trúng → giữ nguyên lượt
    this.io.to(roomId).emit('turn_continue', {
        message: 'Bắn trúng! Bạn được bắn tiếp!'
    });
}
```

#### 2. `client/js/socket.js`
**Thay đổi:** Thêm handler cho event `turn_continue` (dòng 79-83)
- Nhận event mới từ server khi bắn trúng
- Hiển thị notification "Bắn trúng! Bạn được bắn tiếp!"

#### 3. `client/js/ui.js`
**Thay đổi:** Cập nhật message trong `handleAttackResult()` (dòng 125-165)
- **Khi bạn bắn:**
  - Trúng: "Trúng mục tiêu! 🎯 Bắn tiếp!"
  - Trượt: "Trượt! 💨 Lượt của đối thủ!"
- **Khi đối thủ bắn:**
  - Trúng: "[Tên] trúng tàu của bạn! 🎯 Họ được bắn tiếp!"
  - Trượt: "[Tên] bắn trượt! 💨 Đến lượt bạn!"

### 🎯 **Kết quả:**

✅ Game giờ chơi đúng luật Battleship
✅ Người chơi trúng mục tiêu được bắn tiếp đến khi trượt
✅ Message thông báo rõ ràng về lượt chơi
✅ Timer reset mỗi lần bắn (kể cả khi giữ nguyên lượt)

### 🧪 **Cách test:**

1. Tạo game với 2 người chơi
2. Player 1 bắn trúng → Vẫn là lượt Player 1
3. Player 1 tiếp tục bắn trúng → Vẫn là lượt Player 1
4. Player 1 bắn trượt → Chuyển sang lượt Player 2
5. Player 2 bắn trúng → Vẫn là lượt Player 2
6. Cứ thế cho đến khi có người thắng

### 📊 **Impact:**

- **Server:** 1 file sửa
- **Client:** 2 files sửa
- **Breaking change:** Không
- **Database:** Không ảnh hưởng

---

## Version 1.0.0 - Release đầu tiên (20/12/2024)

- ✅ Tất cả tính năng cơ bản
- ✅ Authentication (JWT)
- ✅ WebSocket real-time
- ✅ Game Battleship
- ✅ Chat
- ✅ Video call
- ✅ Timer
- ✅ Lưu lịch sử

