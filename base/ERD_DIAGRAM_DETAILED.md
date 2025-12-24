# 📊 Entity Relationship Diagram - Battleship Game

## Sơ đồ ERD Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BATTLESHIP GAME DATABASE                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘


     ┌──────────────────────────────┐
     │         USERS                │
     │      (Người dùng)            │
     ├──────────────────────────────┤
     │ PK │ _id: ObjectId           │
     │    │ username: String        │◄────┐
     │    │ email: String           │     │
     │    │ password: String        │     │
     │    │ role: String            │     │
     │    │ isGuest: Boolean        │     │ 1
     │    │ guestDisplayName: String│     │
     │    │ lastSeenAt: Date        │     │
     │    │ expiresAt: Date         │     │
     │    │ createdAt: Date         │     │
     │    │ timestamps              │     │
     └──────────────────────────────┘     │
                  │                        │
                  │ 1                      │
                  │                        │
                  ├───────────────┬────────┼─────────────┬──────────────┐
                  │               │        │             │              │
                  │               │        │             │              │
                 N│              N│        │            N│             N│
                  │               │        │             │              │
     ┌────────────▼──────────┐    │        │   ┌─────────▼──────────┐  │
     │      GAMES            │    │        │   │    CALLLOGS        │  │
     │    (Trò chơi)         │    │        │   │  (Nhật ký call)    │  │
     ├───────────────────────┤    │        │   ├────────────────────┤  │
     │ PK │ _id: ObjectId    │    │        │   │ PK │ _id: ObjectId │  │
     │ FK │ player1Id*       │────┘        │   │ FK │ callerId*     │──┘
     │ FK │ player2Id*       │─────────────┘   │ FK │ receiverId*   │────────┐
     │    │ player1Username  │                 │    │ callerUsername│        │
     │    │ player1IsGuest   │                 │    │ receiverUsern.│        │
     │    │ player1DisplayN. │                 │ FK │ roomId        │◄───┐   │
     │    │ player2Username  │                 │ FK │ gameId        │──┐ │   │
     │    │ player2IsGuest   │                 │    │ callType      │  │ │   │
     │    │ player2DisplayN. │                 │    │ status        │  │ │   │
     │    │ roomId: String   │◄───┐            │    │ startedAt     │  │ │   │
     │ FK │ winnerId*        │────┼─────┐      │    │ answeredAt    │  │ │   │
     │    │ winnerUsername   │    │     │      │    │ endedAt       │  │ │   │
     │    │ duration: Number │    │     │      │    │ duration      │  │ │   │
     │    │ startedAt: Date  │    │     │      │    │ timestamps    │  │ │   │
     │    │ endedAt: Date    │    │     │      └────────────────────┘  │ │   │
     │    │ timestamps       │    │     │                               │ │   │
     └──────────────────────┘    │     │                1              │ │   │
                  │               │     │                               │ │   │
                  │ 1             │     │                               │ │   │
                  │               │     └───────────────────────────────┘ │   │
                 N│               │                                       │   │
                  │               │                                       │   │
     ┌────────────▼──────────┐    │                                       │   │
     │    CHATMESSAGES       │    │                                       │   │
     │  (Tin nhắn chat)      │    │                                       │   │
     ├───────────────────────┤    │                                       │   │
     │ PK │ _id: ObjectId    │    │                                       │   │
     │ FK │ roomId           │────┘                                       │   │
     │ FK │ gameId           │────────────────────────────────────────────┘   │
     │ FK │ userId*          │────────────────────────────────────────────────┘
     │    │ username         │
     │    │ isGuest: Boolean │
     │    │ message: String  │
     │    │ messageType      │
     │    │ timestamp: Date  │
     │    │ timestamps       │
     └──────────────────────┘

* FK reference đến users._id (nhưng lưu dạng String)

Ký hiệu:
─────── : Quan hệ 1-1
───<─── : Quan hệ 1-N
```

---

## Chi Tiết Các Bảng

### 1️⃣ **USERS** (Người dùng)

```
┌───────────────────────────────────────────────────────────────┐
│                         USERS                                 │
├─────┬─────────────────────────────┬──────────────────────────┤
│ PK  │ _id                         │ ObjectId                 │
│     │ username                    │ String (unique, index)   │
│     │ email                       │ String                   │
│     │ password                    │ String (hashed)          │
│     │ role                        │ String (user/admin)      │
│     │ isGuest                     │ Boolean (default: false) │
│     │ guestDisplayName            │ String (nullable)        │
│     │ lastSeenAt                  │ Date (index)             │
│     │ expiresAt                   │ Date (TTL index)         │
│     │ createdAt                   │ Date                     │
│     │ updatedAt                   │ Date (auto)              │
└─────┴─────────────────────────────┴──────────────────────────┘

Indexes:
  - username: unique, index
  - role: index
  - isGuest: index
  - lastSeenAt: index
  - expiresAt: TTL index (auto-delete guests after expiry)

Constraints:
  - username: 3-50 chars, required
  - email: lowercase, trimmed
  - password: min 6 chars, required
  - role: enum ['user', 'admin']
```

---

### 2️⃣ **GAMES** (Trò chơi)

```
┌───────────────────────────────────────────────────────────────┐
│                         GAMES                                 │
├─────┬─────────────────────────────┬──────────────────────────┤
│ PK  │ _id                         │ ObjectId                 │
│     │ roomId                      │ String (required)        │
│ FK  │ player1Id                   │ String → users._id       │
│     │ player1Username             │ String                   │
│     │ player1IsGuest              │ Boolean                  │
│     │ player1DisplayName          │ String (nullable)        │
│ FK  │ player2Id                   │ String → users._id       │
│     │ player2Username             │ String                   │
│     │ player2IsGuest              │ Boolean                  │
│     │ player2DisplayName          │ String (nullable)        │
│ FK  │ winnerId                    │ String → users._id       │
│     │ winnerUsername              │ String (nullable)        │
│     │ duration                    │ Number (milliseconds)    │
│     │ startedAt                   │ Date                     │
│     │ endedAt                     │ Date (nullable)          │
│     │ createdAt                   │ Date (auto)              │
│     │ updatedAt                   │ Date (auto)              │
└─────┴─────────────────────────────┴──────────────────────────┘

Indexes:
  - (player1Id + player2Id): compound index
  - winnerId: index
  - endedAt: descending index

Relationships:
  - player1Id → USERS._id (1:N)
  - player2Id → USERS._id (1:N)
  - winnerId → USERS._id (1:N)
```

---

### 3️⃣ **CHATMESSAGES** (Tin nhắn chat)

```
┌───────────────────────────────────────────────────────────────┐
│                     CHATMESSAGES                              │
├─────┬─────────────────────────────┬──────────────────────────┤
│ PK  │ _id                         │ ObjectId                 │
│ FK  │ roomId                      │ String (index)           │
│ FK  │ gameId                      │ ObjectId → games._id     │
│ FK  │ userId                      │ String → users._id       │
│     │ username                    │ String                   │
│     │ isGuest                     │ Boolean                  │
│     │ message                     │ String (max 500 chars)   │
│     │ messageType                 │ String (enum)            │
│     │ timestamp                   │ Date (TTL index)         │
│     │ createdAt                   │ Date (auto)              │
│     │ updatedAt                   │ Date (auto)              │
└─────┴─────────────────────────────┴──────────────────────────┘

Indexes:
  - (roomId + timestamp): compound index (descending)
  - userId: index
  - gameId: index
  - timestamp: TTL index (auto-delete after 7 days)

Constraints:
  - messageType: enum ['text', 'system', 'emoji']
  - message: max 500 characters

Relationships:
  - roomId → GAMES.roomId (1:N)
  - gameId → GAMES._id (1:N)
  - userId → USERS._id (1:N)
```

---

### 4️⃣ **CALLLOGS** (Nhật ký cuộc gọi)

```
┌───────────────────────────────────────────────────────────────┐
│                      CALLLOGS                                 │
├─────┬─────────────────────────────┬──────────────────────────┤
│ PK  │ _id                         │ ObjectId                 │
│ FK  │ roomId                      │ String (index)           │
│ FK  │ gameId                      │ ObjectId → games._id     │
│ FK  │ callerId                    │ String → users._id       │
│     │ callerUsername              │ String                   │
│ FK  │ receiverId                  │ String → users._id       │
│     │ receiverUsername            │ String                   │
│     │ callType                    │ String (enum)            │
│     │ status                      │ String (enum)            │
│     │ startedAt                   │ Date                     │
│     │ answeredAt                  │ Date (nullable)          │
│     │ endedAt                     │ Date (nullable)          │
│     │ duration                    │ Number (seconds)         │
│     │ createdAt                   │ Date (TTL index)         │
│     │ updatedAt                   │ Date (auto)              │
└─────┴─────────────────────────────┴──────────────────────────┘

Indexes:
  - (roomId + startedAt): compound index (descending)
  - callerId: index
  - receiverId: index
  - createdAt: TTL index (auto-delete after 30 days)

Constraints:
  - callType: enum ['video', 'audio']
  - status: enum ['initiated', 'accepted', 'rejected', 'ended', 'missed', 'failed']

Relationships:
  - roomId → GAMES.roomId (1:N)
  - gameId → GAMES._id (1:N)
  - callerId → USERS._id (1:N)
  - receiverId → USERS._id (1:N)
```

---

## Quan Hệ Giữa Các Bảng

### **1:N Relationships**

```
USERS (1) ─────< GAMES (N)
  _id          └─> player1Id
               └─> player2Id
               └─> winnerId

USERS (1) ─────< CHATMESSAGES (N)
  _id          └─> userId

USERS (1) ─────< CALLLOGS (N)
  _id          └─> callerId
               └─> receiverId

GAMES (1) ─────< CHATMESSAGES (N)
  _id          └─> gameId
  roomId       └─> roomId

GAMES (1) ─────< CALLLOGS (N)
  _id          └─> gameId
  roomId       └─> roomId
```

---

## Cardinality (Lực lượng quan hệ)

| Bảng Cha | Quan hệ | Bảng Con | Mô tả |
|----------|---------|----------|-------|
| USERS | 1:N | GAMES | 1 user có thể tham gia nhiều games (player1/player2/winner) |
| USERS | 1:N | CHATMESSAGES | 1 user có thể gửi nhiều messages |
| USERS | 1:N | CALLLOGS | 1 user có thể có nhiều call logs (caller/receiver) |
| GAMES | 1:N | CHATMESSAGES | 1 game có thể có nhiều chat messages |
| GAMES | 1:N | CALLLOGS | 1 game có thể có nhiều call logs |

---

## TTL (Time To Live) Indexes

MongoDB tự động xoá documents dựa trên TTL:

| Bảng | Field TTL | Thời gian | Mục đích |
|------|-----------|-----------|----------|
| USERS | expiresAt | 0s (delete ngay khi expire) | Xoá guest users hết hạn |
| CHATMESSAGES | timestamp | 7 ngày | Xoá chat cũ tiết kiệm storage |
| CALLLOGS | createdAt | 30 ngày | Xoá call logs cũ |

---

## Indexes Performance

### **Compound Indexes**
- `games`: (player1Id + player2Id) - Query nhanh theo 2 players
- `chatmessages`: (roomId + timestamp DESC) - Load chat theo room mới nhất
- `calllogs`: (roomId + startedAt DESC) - Load call logs theo room mới nhất

### **Single Indexes**
- `users.username`: Unique index cho login
- `users.role`: Filter user/admin
- `users.isGuest`: Filter guests
- `games.winnerId`: Query game history theo winner
- `chatmessages.userId`: Query messages theo user
- `calllogs.callerId/receiverId`: Query call history theo user

---

## Lưu Ý Kỹ Thuật

### ⚠️ Foreign Keys
- MongoDB không enforce foreign key constraints
- `userId`, `player1Id`, `player2Id` lưu dạng **String** (không phải ObjectId)
- Phải validate manually trong application layer

### 🔒 Security
- `password`: Được hash bằng bcrypt (không lưu plaintext)
- `expiresAt`: TTL index tự động xoá guest users

### 📊 Data Types
- `_id`: MongoDB ObjectId (auto-generated)
- Timestamps: Mongoose tự động thêm `createdAt` và `updatedAt`
- Duration: Games (milliseconds), CallLogs (seconds)

---

**Tạo bởi:** GitHub Copilot  
**Dựa trên:** Mongoose Models trong project Battleship  
**Ngày tạo:** December 24, 2025
