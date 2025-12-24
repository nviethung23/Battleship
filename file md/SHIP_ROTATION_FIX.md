# Ship Rotation Fix - Vertical Ships No Longer Broken

## 🐛 BUG FOUND

**Problem**: Ships render broken/blurry in vertical orientation (screenshot shows 4 stacked ships with distorted images)

**Root Cause**: 
- Ship PNG files are **HORIZONTAL** by default (e.g., carrier.png = 250x50px)
- Code was treating them as **VERTICAL** images and applying wrong rotation
- Transform formula: `rotate(90deg)` moved the image but wrong pivot/translate caused distortion

## ✅ FIX APPLIED

### 1. Corrected Rotation Logic

**game.js - renderPlacementBoard()** (Lines 584-605):
```javascript
// BEFORE (WRONG):
ghost.style.width = `${height}px`;  // Swapping dimensions
ghost.style.height = `${width}px`;
ghost.style.transform = `translate(${translateX}px, ${translateY}px) rotate(90deg)`;

// AFTER (CORRECT):
ghost.style.width = `${imgWidth}px`; // Keep PNG's original width
ghost.style.height = `${imgHeight}px`;
ghost.style.transform = `translate(${translateX}px, ${translateY}px) rotate(90deg) translate(-${translateX}px, -${translateY}px)`;
```

**Key Changes**:
- Don't swap width/height BEFORE rotation
- Use double translate: move to center → rotate → move back
- This prevents the image from "jumping" position during rotation

### 2. Fixed Ghost Preview

**shipDock.js - showGhostPreview()** (Lines 285-320):
- Applied same rotation logic to ghost preview
- Ensures dragging preview matches final placement

### 3. Updated Guide Text

**game.html** (Line 87):
```html
<!-- BEFORE -->
Kéo tàu từ Fleet vào bàn cờ | Nhấn R khi kéo để xoay | 🔄 Random đặt tự động

<!-- AFTER -->
Nhấn R khi kéo để xoay tàu | 🔄 Random bên phải để đặt tự động
```

**Removed**: "Kéo tàu từ Fleet vào bàn cờ" (redundant/obvious)  
**Kept**: Core instructions (R to rotate, Random button location)

## 📐 TECHNICAL EXPLANATION

### Why Ships Were Breaking

1. **PNG Structure**: All ship images are designed horizontally
   - carrier.png: 250px wide × 50px tall (5 cells × 1 cell)
   - battleship.png: 200px × 50px (4 × 1)
   - cruiser.png: 150px × 50px (3 × 1)
   - etc.

2. **Wrong Assumption**: Code assumed vertical ships needed width/height swap
   ```javascript
   // This breaks the image aspect ratio:
   style.width = `${height}px`;  // 150px becomes height
   style.height = `${width}px`;  // 50px becomes width
   // Result: 50x150px image stretched into 150x50px box = distortion
   ```

3. **Correct Approach**: Keep original dimensions, just rotate
   ```javascript
   style.width = `${imgWidth}px`;  // Keep 150px width
   style.height = `${imgHeight}px`; // Keep 50px height
   transform = 'rotate(90deg)';     // Rotate the 150x50 image
   // Result: Clean rotation, no stretching
   ```

### Transform Pivot Math

For a ship at grid position (col, row):

**Horizontal** (no rotation):
```
left = col * 50px
top = row * 50px
width = size * 50px
height = 50px
transform = none
```

**Vertical** (90° clockwise):
```
left = col * 50px          // Top-left anchor
top = row * 50px
width = size * 50px        // Original PNG width
height = 50px              // Original PNG height

// Rotation sequence:
1. translate(25px, 25px)   // Move to cell center
2. rotate(90deg)           // Rotate around center
3. translate(-25px, -25px) // Move back to anchor

Result: Image rotates cleanly around grid cell intersection
```

## 🎯 RESULT

- ✅ Horizontal ships: Crisp, aligned (unchanged)
- ✅ Vertical ships: Crisp, no distortion, properly rotated
- ✅ Ghost preview: Matches final placement exactly
- ✅ Guide text: Concise, focuses on controls

## 📁 FILES MODIFIED

1. **game.html** - Guide banner text (Line 87)
2. **game.js** - Vertical ship rotation (Lines 584-605)
3. **shipDock.js** - Ghost preview rotation (Lines 285-320)

## 🧪 TESTING

1. Drag a ship from dock to board
2. Press `R` to toggle horizontal/vertical
3. Drop ship in vertical orientation
4. **Expected**: Ship image is crisp and perfectly aligned
5. **Before fix**: Ship was distorted/blurry
6. **After fix**: Ship renders cleanly

---

**Status**: ✅ FIXED - All ships now render correctly in both orientations!
