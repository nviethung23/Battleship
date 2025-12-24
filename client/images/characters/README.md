# Character Images Guide

## 📁 Cấu trúc folder:

```
client/images/characters/
├── input/                    ← ĐẶT ẢNH GỐC Ở ĐÂY
│   ├── character1/
│   │   ├── avatar.png        (ảnh gốc, kích thước bất kỳ)
│   │   └── ships/
│   │       ├── carrier.png
│   │       ├── battleship.png
│   │       ├── cruiser.png
│   │       ├── submarine.png
│   │       └── destroyer.png
│   ├── character2/
│   │   └── ...
│   └── character3/
│       └── ...
│
└── character1/               ← OUTPUT (tự động tạo)
    ├── avatar-large.png     (400x500px)
    ├── avatar-medium.png    (250x300px)
    ├── avatar-small.png     (150x180px)
    ├── avatar-thumb.png     (80x100px)
    └── ships/
        ├── carrier.png
        ├── battleship.png
        ├── cruiser.png
        ├── submarine.png
        └── destroyer.png
```

## 🚀 Cách sử dụng:

### Bước 1: Đặt ảnh vào folder input
1. Tạo folder `client/images/characters/input/`
2. Tạo folder cho mỗi nhân vật: `character1/`, `character2/`, ...
3. Đặt ảnh avatar vào folder nhân vật (tên file: `avatar.png` hoặc bất kỳ)
4. Tạo folder `ships/` trong folder nhân vật
5. Đặt 5 ảnh thuyền vào folder `ships/`:
   - `carrier.png` (hoặc tên khác, script sẽ tự nhận)
   - `battleship.png`
   - `cruiser.png`
   - `submarine.png`
   - `destroyer.png`

### Bước 2: Chạy script resize
```bash
npm run resize-images
```

### Bước 3: Kiểm tra kết quả
Script sẽ tự động:
- Resize avatar thành 4 kích thước (large, medium, small, thumb)
- Resize ships thành 100x100px
- Lưu vào folder `client/images/characters/characterX/`

## 📐 Kích thước output:

### Avatars:
| Loại | Kích thước | Dùng cho |
|------|------------|----------|
| Large | 400x500px | Game screen (2 bên) |
| Medium | 250x300px | Character selection |
| Small | 150x180px | UI elements |
| Thumb | 80x100px | Lists |

### Ships (theo số ô trên board):
| Tàu | Số ô | Kích thước | File name |
|-----|------|------------|-----------|
| Carrier | 5 ô | 250px | `carrier.png` |
| Battleship | 4 ô | 200px | `battleship.png` |
| Cruiser | 3 ô | 150px | `cruiser.png` |
| Submarine | 3 ô | 150px | `submarine.png` |
| Destroyer | 2 ô | 100px | `destroyer.png` |

**Lưu ý:** Script tự động resize ảnh tàu để vừa với số ô trên board (mỗi ô = 50px). Ảnh sẽ được resize theo chiều dài (ngang hoặc dọc) và giữ nguyên tỷ lệ.

## 💡 Lưu ý:

- Ảnh gốc có thể là bất kỳ kích thước nào
- Script sẽ tự động giữ nguyên tỷ lệ (không crop)
- Format output: PNG với transparent background
- Tên file avatar: Có thể là `avatar.png`, `character.png`, hoặc bất kỳ tên nào

