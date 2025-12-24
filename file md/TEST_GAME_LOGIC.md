# 🧪 HƯỚNG DẪN TEST LOGIC GAME

## 🎯 Mục đích test

Kiểm tra logic lượt chơi mới: **"Bắn trúng được bắn tiếp, bắn trượt mới đổi lượt"**

---

## 📋 SCENARIO TEST

### **Test Case 1: Bắn trúng liên tiếp**

**Setup:**
- Player 1 và Player 2 vào game
- Cả 2 đã đặt tàu xong
- Game bắt đầu, lượt Player 1

**Steps:**
1. Player 1 bắn vào ô có tàu của Player 2 → **TRÚNG**
2. Kiểm tra: Vẫn là lượt Player 1
3. Thông báo: "Trúng mục tiêu! 🎯 Bắn tiếp!"
4. Player 1 bắn tiếp vào ô khác có tàu → **TRÚNG**
5. Kiểm tra: Vẫn là lượt Player 1
6. Player 1 bắn tiếp vào ô khác có tàu → **TRÚNG**
7. Kiểm tra: Vẫn là lượt Player 1

**Expected Result:**
- ✅ Player 1 được bắn liên tục khi trúng
- ✅ Notification hiển thị "Bắn tiếp!"
- ✅ Turn indicator vẫn là "Lượt của bạn!"
- ✅ Timer reset về 60s sau mỗi lần bắn

---

### **Test Case 2: Bắn trúng rồi bắn trượt**

**Setup:**
- Tiếp tục từ Test Case 1
- Đang là lượt Player 1

**Steps:**
1. Player 1 bắn vào ô KHÔNG có tàu → **TRƯỢT**
2. Kiểm tra: Chuyển sang lượt Player 2
3. Thông báo: "Trượt! 💨 Lượt của đối thủ!"
4. Player 2 màn hình hiện: "Đến lượt bạn!"

**Expected Result:**
- ✅ Chuyển lượt sang Player 2
- ✅ Player 1 không thể click bắn nữa
- ✅ Player 2 có thể bắn
- ✅ Timer reset về 60s

---

### **Test Case 3: Đánh chìm tàu**

**Setup:**
- Player 1 đã bắn trúng 1 tàu Destroyer (2 ô) 1 lần
- Còn 1 ô nữa để đánh chìm

**Steps:**
1. Player 1 bắn trúng ô còn lại của Destroyer → **TRÚNG & CHÌM**
2. Kiểm tra: Vẫn là lượt Player 1
3. Thông báo: "Trúng và đánh chìm Destroyer! 💥 Bắn tiếp!"
4. Player 1 có thể tiếp tục bắn

**Expected Result:**
- ✅ Tàu Destroyer bị đánh chìm
- ✅ Vẫn là lượt Player 1
- ✅ Notification đặc biệt khi đánh chìm
- ✅ Player 1 được bắn tiếp

---

### **Test Case 4: Cả 2 player bắn xen kẽ**

**Scenario thực tế:**

```
Lượt 1: Player 1 bắn → TRÚNG → Bắn tiếp
Lượt 2: Player 1 bắn → TRÚNG → Bắn tiếp
Lượt 3: Player 1 bắn → TRƯỢT → Chuyển lượt
Lượt 4: Player 2 bắn → TRÚNG → Bắn tiếp
Lượt 5: Player 2 bắn → TRƯỢT → Chuyển lượt
Lượt 6: Player 1 bắn → TRÚNG → Bắn tiếp
...
```

**Expected Result:**
- ✅ Chỉ đổi lượt khi bắn trượt
- ✅ Messages rõ ràng về trạng thái lượt
- ✅ UI update chính xác

---

### **Test Case 5: Timer khi giữ nguyên lượt**

**Setup:**
- Player 1 bắn trúng, được bắn tiếp
- Timer đang đếm ngược

**Steps:**
1. Player 1 bắn trúng khi timer còn 45s
2. Kiểm tra: Timer reset về 60s
3. Player 1 không bắn, để timer hết
4. Kiểm tra: Auto chuyển lượt sang Player 2

**Expected Result:**
- ✅ Timer reset sau mỗi lần bắn trúng
- ✅ Timeout vẫn chuyển lượt đúng
- ✅ Không bị bug timer

---

### **Test Case 6: Disconnect khi đang giữ lượt**

**Setup:**
- Player 1 bắn trúng 3 lần liên tiếp
- Vẫn đang là lượt Player 1

**Steps:**
1. Player 1 disconnect
2. Kiểm tra: Player 2 nhận thông báo
3. Kiểm tra: Game kết thúc, Player 2 thắng

**Expected Result:**
- ✅ Xử lý disconnect đúng
- ✅ Không bị treo game
- ✅ Player 2 được tính thắng

---

## 🎮 CÁCH TEST

### **Option 1: Test thủ công**

1. Mở 2 trình duyệt (Chrome + Firefox hoặc Chrome + Incognito)
2. Đăng ký 2 tài khoản khác nhau
3. Tạo phòng và join
4. Đặt tàu sao cho biết vị trí tàu của nhau (để test dễ)
5. Chơi theo các scenario trên

### **Option 2: Test với console**

Mở Console (F12) và xem logs:
- `attack_result` events
- `turn_changed` events
- `turn_continue` events (event mới)

### **Option 3: Test với 1 người (Debug)**

Đặt tàu sao cho biết chính xác vị trí, tự bắn và kiểm tra logic.

---

## ✅ CHECKLIST TEST

Đã test xong khi:
- [ ] Bắn trúng liên tiếp được
- [ ] Bắn trượt thì đổi lượt
- [ ] Đánh chìm tàu vẫn được bắn tiếp
- [ ] Messages hiển thị đúng
- [ ] Timer hoạt động đúng
- [ ] Không có lỗi console
- [ ] Game chơi mượt mà
- [ ] Cả 2 player đều thấy state đồng bộ

---

## 🐛 NẾU GẶP LỖI

### Lỗi 1: Không đổi lượt khi bắn trượt
- Check console xem có event `turn_changed` không
- Check server log

### Lỗi 2: Vẫn đổi lượt khi bắn trúng
- Xóa cache browser
- Restart server
- Chắc chắn đã update code

### Lỗi 3: Message không hiển thị
- Check event `turn_continue` trong console
- Kiểm tra file `socket.js` đã có handler chưa

---

## 📊 KẾT QUẢ MONG ĐỢI

**Trước khi fix:**
```
Player 1: Bắn → Trúng → Đổi lượt ❌
Player 2: Bắn → Trúng → Đổi lượt ❌
Player 1: Bắn → Trượt → Đổi lượt ✓
```

**Sau khi fix:**
```
Player 1: Bắn → Trúng → Vẫn lượt P1 ✅
Player 1: Bắn → Trúng → Vẫn lượt P1 ✅
Player 1: Bắn → Trượt → Đổi sang P2 ✅
Player 2: Bắn → Trúng → Vẫn lượt P2 ✅
```

---

Chúc bạn test thành công! 🎉

