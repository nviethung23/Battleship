# BATTLESHIP - DATABASE SCHEMA DIAGRAM (SQL Style)
## ERD dạng SQL cho MongoDB Collections

---

## 1. DATABASE SCHEMA DIAGRAM

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                    DATABASE: battleship                                        ┃
┃                                    Provider: MongoDB Atlas                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         users                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  _id              ObjectId        PK       NOT NULL    AUTO                                     │
│  username         String(50)      UQ       NOT NULL    UNIQUE INDEX                             │
│  email            String(100)              NULL                                                 │
│  password         String(255)              NOT NULL    bcrypt hash                              │
│  role             String(20)               NOT NULL    DEFAULT 'user'   ENUM('user','admin')    │
│  isGuest          Boolean                  NOT NULL    DEFAULT false                            │
│  guestDisplayName String(50)               NULL                                                 │
│  lastSeenAt       Date                     NULL                                                 │
│  expiresAt        Date                     NULL        TTL INDEX (guests auto-delete)           │
│  createdAt        Date                     NOT NULL    DEFAULT now()                            │
│  updatedAt        Date                     NOT NULL    DEFAULT now()                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  INDEXES:                                                                                       │
│    - PRIMARY KEY (_id)                                                                          │
│    - UNIQUE INDEX (username)                                                                    │
│    - TTL INDEX (expiresAt) - Auto delete expired guests                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ 1
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    │ N                       │ N                       │ N
                    ▼                         ▼                         ▼
┌───────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────────┐
│           games               │ │      chatmessages         │ │         calllogs              │
├───────────────────────────────┤ ├───────────────────────────┤ ├───────────────────────────────┤
│ _id         ObjectId    PK    │ │ _id        ObjectId   PK  │ │ _id          ObjectId    PK   │
│ roomId      String      NN    │ │ roomId     String     NN  │ │ roomId       String      NN   │
│ player1Id   String      FK→U  │ │ gameId     ObjectId   FK→G│ │ gameId       ObjectId    FK→G │
│ player1Username String  NN    │ │ userId     String     FK→U│ │ callerId     String      FK→U │
│ player1IsGuest  Boolean NN    │ │ username   String     NN  │ │ callerUsername String    NN   │
│ player1DisplayName String     │ │ isGuest    Boolean    NN  │ │ receiverId   String      FK→U │
│ player2Id   String      FK→U  │ │ message    String     NN  │ │ receiverUsername String  NN   │
│ player2Username String  NN    │ │ messageType String    NN  │ │ callType     String      NN   │
│ player2IsGuest  Boolean NN    │ │ timestamp  Date       NN  │ │ status       String      NN   │
│ player2DisplayName String     │ │ createdAt  Date       NN  │ │ startedAt    Date        NN   │
│ winnerId    String      FK→U  │ │ updatedAt  Date       NN  │ │ answeredAt   Date             │
│ winnerUsername String         │ ├───────────────────────────┤ │ endedAt      Date             │
│ duration    Number      NN    │ │ INDEXES:                  │ │ duration     Number           │
│ startedAt   Date        NN    │ │  - PRIMARY KEY (_id)      │ │ createdAt    Date        NN   │
│ endedAt     Date              │ │  - INDEX (roomId)         │ │ updatedAt    Date        NN   │
│ createdAt   Date        NN    │ │  - INDEX (gameId)         │ ├───────────────────────────────┤
│ updatedAt   Date        NN    │ │  - TTL INDEX (timestamp)  │ │ INDEXES:                      │
├───────────────────────────────┤ │    expires: 7 days        │ │  - PRIMARY KEY (_id)          │
│ INDEXES:                      │ └───────────────────────────┘ │  - INDEX (roomId)             │
│  - PRIMARY KEY (_id)          │                               │  - INDEX (gameId)             │
│  - INDEX (roomId)             │                               └───────────────────────────────┘
│  - INDEX (player1Id)          │
│  - INDEX (player2Id)          │
│  - INDEX (winnerId)           │
└───────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════════════════
                                        RELATIONSHIPS
═══════════════════════════════════════════════════════════════════════════════════════════════════

    users (1) ──────────────< games (N)         : player1Id, player2Id, winnerId
    users (1) ──────────────< chatmessages (N)  : userId  
    users (1) ──────────────< calllogs (N)      : callerId, receiverId
    games (1) ──────────────< chatmessages (N)  : gameId (optional)
    games (1) ──────────────< calllogs (N)      : gameId (optional)
```

---

## 2. TABLE DEFINITIONS (SQL-Like Syntax)

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: users
-- Description: Stores user accounts (regular users and guests)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    _id             OBJECTID        PRIMARY KEY,
    username        VARCHAR(50)     NOT NULL UNIQUE,
    email           VARCHAR(100)    NULL,
    password        VARCHAR(255)    NOT NULL,           -- bcrypt hashed
    role            ENUM('user', 'admin') DEFAULT 'user',
    isGuest         BOOLEAN         NOT NULL DEFAULT FALSE,
    guestDisplayName VARCHAR(50)    NULL,               -- Display name for guests
    lastSeenAt      DATETIME        NULL,
    expiresAt       DATETIME        NULL,               -- TTL for guest auto-cleanup
    createdAt       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_expiresAt ON users(expiresAt) WHERE expiresAt IS NOT NULL;
-- TTL Index: Documents with expiresAt will be auto-deleted when expired


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: games  
-- Description: Stores completed game records
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE games (
    _id                 OBJECTID        PRIMARY KEY,
    roomId              VARCHAR(50)     NOT NULL,
    
    -- Player 1 Info (snapshot at game time)
    player1Id           VARCHAR(50)     NOT NULL REFERENCES users(_id),
    player1Username     VARCHAR(50)     NOT NULL,
    player1IsGuest      BOOLEAN         NOT NULL DEFAULT FALSE,
    player1DisplayName  VARCHAR(50)     NULL,
    
    -- Player 2 Info (snapshot at game time)  
    player2Id           VARCHAR(50)     NOT NULL REFERENCES users(_id),
    player2Username     VARCHAR(50)     NOT NULL,
    player2IsGuest      BOOLEAN         NOT NULL DEFAULT FALSE,
    player2DisplayName  VARCHAR(50)     NULL,
    
    -- Game Result
    winnerId            VARCHAR(50)     NULL REFERENCES users(_id),
    winnerUsername      VARCHAR(50)     NULL,
    duration            INTEGER         NOT NULL DEFAULT 0,  -- milliseconds
    
    -- Timestamps
    startedAt           DATETIME        NOT NULL,
    endedAt             DATETIME        NULL,
    createdAt           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_games_roomId ON games(roomId);
CREATE INDEX idx_games_player1Id ON games(player1Id);
CREATE INDEX idx_games_player2Id ON games(player2Id);
CREATE INDEX idx_games_winnerId ON games(winnerId);
CREATE INDEX idx_games_endedAt ON games(endedAt);


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: chatmessages
-- Description: Stores chat messages with 7-day auto-expiration
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE chatmessages (
    _id             OBJECTID        PRIMARY KEY,
    roomId          VARCHAR(50)     NOT NULL,
    gameId          OBJECTID        NULL REFERENCES games(_id),
    userId          VARCHAR(50)     NOT NULL REFERENCES users(_id),
    username        VARCHAR(50)     NOT NULL,
    isGuest         BOOLEAN         NOT NULL DEFAULT FALSE,
    message         TEXT            NOT NULL,
    messageType     ENUM('text', 'system') NOT NULL DEFAULT 'text',
    timestamp       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_chatmessages_roomId ON chatmessages(roomId);
CREATE INDEX idx_chatmessages_gameId ON chatmessages(gameId);
CREATE INDEX idx_chatmessages_timestamp ON chatmessages(timestamp);
-- TTL Index: Auto-delete after 7 days
CREATE INDEX idx_chatmessages_ttl ON chatmessages(timestamp) EXPIRE AFTER 604800;


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: calllogs
-- Description: Stores WebRTC video/audio call history
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE calllogs (
    _id                 OBJECTID        PRIMARY KEY,
    roomId              VARCHAR(50)     NOT NULL,
    gameId              OBJECTID        NULL REFERENCES games(_id),
    
    -- Caller Info
    callerId            VARCHAR(50)     NOT NULL REFERENCES users(_id),
    callerUsername      VARCHAR(50)     NOT NULL,
    
    -- Receiver Info
    receiverId          VARCHAR(50)     NOT NULL REFERENCES users(_id),
    receiverUsername    VARCHAR(50)     NOT NULL,
    
    -- Call Details
    callType            ENUM('video', 'audio') NOT NULL DEFAULT 'video',
    status              ENUM('initiated', 'accepted', 'rejected', 'ended', 'missed') 
                        NOT NULL DEFAULT 'initiated',
    
    -- Timestamps
    startedAt           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answeredAt          DATETIME        NULL,
    endedAt             DATETIME        NULL,
    duration            INTEGER         NULL,       -- seconds
    
    createdAt           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_calllogs_roomId ON calllogs(roomId);
CREATE INDEX idx_calllogs_gameId ON calllogs(gameId);
CREATE INDEX idx_calllogs_callerId ON calllogs(callerId);
CREATE INDEX idx_calllogs_receiverId ON calllogs(receiverId);
CREATE INDEX idx_calllogs_startedAt ON calllogs(startedAt);
```

---

## 3. DETAILED ENTITY DIAGRAM

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                    users                                         ┃
┣━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Column             ┃ Type         ┃ Key    ┃ Nullable   ┃ Default/Note           ┃
┣━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ _id                ┃ ObjectId     ┃ PK     ┃ NOT NULL   ┃ Auto-generated         ┃
┃ username           ┃ String(50)   ┃ UQ     ┃ NOT NULL   ┃ Unique constraint      ┃
┃ email              ┃ String(100)  ┃        ┃ NULL       ┃                        ┃
┃ password           ┃ String(255)  ┃        ┃ NOT NULL   ┃ bcrypt hash            ┃
┃ role               ┃ String       ┃        ┃ NOT NULL   ┃ 'user' | 'admin'       ┃
┃ isGuest            ┃ Boolean      ┃        ┃ NOT NULL   ┃ false                  ┃
┃ guestDisplayName   ┃ String(50)   ┃        ┃ NULL       ┃ For guest users        ┃
┃ lastSeenAt         ┃ Date         ┃        ┃ NULL       ┃                        ┃
┃ expiresAt          ┃ Date         ┃ TTL    ┃ NULL       ┃ Guest auto-delete      ┃
┃ createdAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┃ updatedAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┗━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                    games                                         ┃
┣━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Column             ┃ Type         ┃ Key    ┃ Nullable   ┃ Default/Note           ┃
┣━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ _id                ┃ ObjectId     ┃ PK     ┃ NOT NULL   ┃ Auto-generated         ┃
┃ roomId             ┃ String       ┃ IDX    ┃ NOT NULL   ┃ room_xxx format        ┃
┃ player1Id          ┃ String       ┃ FK→U   ┃ NOT NULL   ┃ → users._id            ┃
┃ player1Username    ┃ String       ┃        ┃ NOT NULL   ┃ Snapshot               ┃
┃ player1IsGuest     ┃ Boolean      ┃        ┃ NOT NULL   ┃ false                  ┃
┃ player1DisplayName ┃ String       ┃        ┃ NULL       ┃ Guest display name     ┃
┃ player2Id          ┃ String       ┃ FK→U   ┃ NOT NULL   ┃ → users._id            ┃
┃ player2Username    ┃ String       ┃        ┃ NOT NULL   ┃ Snapshot               ┃
┃ player2IsGuest     ┃ Boolean      ┃        ┃ NOT NULL   ┃ false                  ┃
┃ player2DisplayName ┃ String       ┃        ┃ NULL       ┃ Guest display name     ┃
┃ winnerId           ┃ String       ┃ FK→U   ┃ NULL       ┃ → users._id            ┃
┃ winnerUsername     ┃ String       ┃        ┃ NULL       ┃ Snapshot               ┃
┃ duration           ┃ Number       ┃        ┃ NOT NULL   ┃ 0 (milliseconds)       ┃
┃ startedAt          ┃ Date         ┃        ┃ NOT NULL   ┃                        ┃
┃ endedAt            ┃ Date         ┃        ┃ NULL       ┃                        ┃
┃ createdAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┃ updatedAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┗━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                 chatmessages                                     ┃
┣━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Column             ┃ Type         ┃ Key    ┃ Nullable   ┃ Default/Note           ┃
┣━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ _id                ┃ ObjectId     ┃ PK     ┃ NOT NULL   ┃ Auto-generated         ┃
┃ roomId             ┃ String       ┃ IDX    ┃ NOT NULL   ┃                        ┃
┃ gameId             ┃ ObjectId     ┃ FK→G   ┃ NULL       ┃ → games._id            ┃
┃ userId             ┃ String       ┃ FK→U   ┃ NOT NULL   ┃ → users._id            ┃
┃ username           ┃ String       ┃        ┃ NOT NULL   ┃ Snapshot               ┃
┃ isGuest            ┃ Boolean      ┃        ┃ NOT NULL   ┃ false                  ┃
┃ message            ┃ String       ┃        ┃ NOT NULL   ┃ Max 500 chars          ┃
┃ messageType        ┃ String       ┃        ┃ NOT NULL   ┃ 'text' | 'system'      ┃
┃ timestamp          ┃ Date         ┃ TTL    ┃ NOT NULL   ┃ 7 days auto-delete     ┃
┃ createdAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┃ updatedAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┗━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                   calllogs                                       ┃
┣━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Column             ┃ Type         ┃ Key    ┃ Nullable   ┃ Default/Note           ┃
┣━━━━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ _id                ┃ ObjectId     ┃ PK     ┃ NOT NULL   ┃ Auto-generated         ┃
┃ roomId             ┃ String       ┃ IDX    ┃ NOT NULL   ┃                        ┃
┃ gameId             ┃ ObjectId     ┃ FK→G   ┃ NULL       ┃ → games._id            ┃
┃ callerId           ┃ String       ┃ FK→U   ┃ NOT NULL   ┃ → users._id            ┃
┃ callerUsername     ┃ String       ┃        ┃ NOT NULL   ┃ Snapshot               ┃
┃ receiverId         ┃ String       ┃ FK→U   ┃ NOT NULL   ┃ → users._id            ┃
┃ receiverUsername   ┃ String       ┃        ┃ NOT NULL   ┃ Snapshot               ┃
┃ callType           ┃ String       ┃        ┃ NOT NULL   ┃ 'video' | 'audio'      ┃
┃ status             ┃ String       ┃        ┃ NOT NULL   ┃ initiated|accepted|    ┃
┃                    ┃              ┃        ┃            ┃ rejected|ended|missed  ┃
┃ startedAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┃ answeredAt         ┃ Date         ┃        ┃ NULL       ┃                        ┃
┃ endedAt            ┃ Date         ┃        ┃ NULL       ┃                        ┃
┃ duration           ┃ Number       ┃        ┃ NULL       ┃ seconds                ┃
┃ createdAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┃ updatedAt          ┃ Date         ┃        ┃ NOT NULL   ┃ now()                  ┃
┗━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 4. VISUAL ERD (Crow's Foot Notation)

```
                                    ┌─────────────────────┐
                                    │       users         │
                                    ├─────────────────────┤
                                    │ PK  _id             │
                                    │ UQ  username        │
                                    │     email           │
                                    │     password        │
                                    │     role            │
                                    │     isGuest         │
                                    │     guestDisplayName│
                                    │     lastSeenAt      │
                                    │ TTL expiresAt       │
                                    │     createdAt       │
                                    │     updatedAt       │
                                    └──────────┬──────────┘
                                               │
                 ┌─────────────────────────────┼─────────────────────────────┐
                 │                             │                             │
                 │ player1Id                   │ userId                      │ callerId
                 │ player2Id                   │                             │ receiverId
                 │ winnerId                    │                             │
                 │                             │                             │
        ─────────┼──────────          ─────────┼──────────          ─────────┼──────────
       │         │          │        │         │          │        │         │          │
       │         ▼          │        │         ▼          │        │         ▼          │
       │  ┌─────────────┐   │        │  ┌─────────────┐   │        │  ┌─────────────┐   │
       │  │   games     │   │        │  │chatmessages │   │        │  │  calllogs   │   │
       │  ├─────────────┤   │        │  ├─────────────┤   │        │  ├─────────────┤   │
       │  │PK _id       │   │        │  │PK _id       │   │        │  │PK _id       │   │
       │  │   roomId    │───┼────────┼──│   roomId    │   │        │  │   roomId    │   │
       │  │FK player1Id │   │        │  │FK gameId    │◄──┼────────┼──│FK gameId    │   │
       │  │FK player2Id │   │        │  │FK userId    │   │        │  │FK callerId  │   │
       │  │FK winnerId  │   │        │  │   username  │   │        │  │FK receiverId│   │
       │  │   duration  │   │        │  │   message   │   │        │  │   callType  │   │
       │  │   startedAt │   │        │  │   messageType   │        │  │   status    │   │
       │  │   endedAt   │   │        │  │TTL timestamp│   │        │  │   duration  │   │
       │  └─────────────┘   │        │  └─────────────┘   │        │  └─────────────┘   │
       │                    │        │                    │        │                    │
       └────────────────────┘        └────────────────────┘        └────────────────────┘
       
       
═══════════════════════════════════════════════════════════════════════════════════════════
                                CARDINALITY LEGEND
═══════════════════════════════════════════════════════════════════════════════════════════

    ──┼──     One (mandatory)
    ──○──     Zero or One (optional)  
    ──<──     Many
    ──┼<──    One to Many
    ──○<──    Zero to Many

    
═══════════════════════════════════════════════════════════════════════════════════════════
                                   RELATIONSHIPS
═══════════════════════════════════════════════════════════════════════════════════════════

    users      1 ────────────< N     games         (as player1, player2, winner)
    users      1 ────────────< N     chatmessages  (as sender)
    users      1 ────────────< N     calllogs      (as caller, receiver)
    games      1 ○───────────< N     chatmessages  (optional link)
    games      1 ○───────────< N     calllogs      (optional link)
```

---

## 5. SAMPLE DATA

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE: users
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users VALUES
('507f1f77bcf86cd799439011', 'player1', 'player1@email.com', '$2b$10$xxx...', 'user', false, null, null, null, '2024-12-24', '2024-12-24'),
('507f1f77bcf86cd799439012', 'player2', 'player2@email.com', '$2b$10$xxx...', 'user', false, null, null, null, '2024-12-24', '2024-12-24'),
('507f1f77bcf86cd799439013', 'guest_1735012345678', 'guest_xxx@guest.local', 'guest_no_password', 'user', true, 'CoolGuest', '2024-12-24', '2024-12-25', '2024-12-24', '2024-12-24'),
('507f1f77bcf86cd799439014', 'admin', 'admin@battleship.com', '$2b$10$xxx...', 'admin', false, null, null, null, '2024-12-24', '2024-12-24');


-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE: games
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO games VALUES
('60d5ec9af682fbd12a893482', 'room_abc123', 
 '507f1f77bcf86cd799439011', 'player1', false, null,
 '507f1f77bcf86cd799439012', 'player2', false, null,
 '507f1f77bcf86cd799439011', 'player1', 
 245000, '2024-12-24 10:00:00', '2024-12-24 10:04:05', '2024-12-24', '2024-12-24');


-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE: chatmessages
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO chatmessages VALUES
('60d5ecaaf682fbd12a893483', 'room_abc123', '60d5ec9af682fbd12a893482', 
 '507f1f77bcf86cd799439011', 'player1', false, 'Hello!', 'text', 
 '2024-12-24 10:01:00', '2024-12-24', '2024-12-24'),
('60d5ecbbf682fbd12a893484', 'room_abc123', '60d5ec9af682fbd12a893482',
 'system', 'System', false, 'player1 đã tham gia', 'system',
 '2024-12-24 10:00:00', '2024-12-24', '2024-12-24');


-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE: calllogs  
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO calllogs VALUES
('60d5ecccf682fbd12a893485', 'room_abc123', '60d5ec9af682fbd12a893482',
 '507f1f77bcf86cd799439011', 'player1',
 '507f1f77bcf86cd799439012', 'player2',
 'video', 'ended',
 '2024-12-24 10:02:00', '2024-12-24 10:02:05', '2024-12-24 10:03:30', 85,
 '2024-12-24', '2024-12-24');
```

---

**END OF DATABASE SCHEMA DIAGRAM**
