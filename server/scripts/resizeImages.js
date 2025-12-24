const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Cấu hình kích thước
const SIZES = {
    large: { width: 400, height: 500, suffix: 'large' },
    medium: { width: 250, height: 300, suffix: 'medium' },
    small: { width: 150, height: 180, suffix: 'small' },
    thumb: { width: 80, height: 100, suffix: 'thumb' }
};

// Kích thước ships theo số ô (mỗi ô = 50px)
const SHIP_SIZES = {
    carrier: 5 * 50,      // 250px (5 ô)
    battleship: 4 * 50,   // 200px (4 ô)
    cruiser: 3 * 50,      // 150px (3 ô)
    submarine: 3 * 50,    // 150px (3 ô)
    destroyer: 2 * 50     // 100px (2 ô)
};

const CELL_SIZE = 50; // Kích thước mỗi ô trên board

// Mode resize: 'contain' (giữ tỷ lệ, không méo) hoặc 'fill' (kéo dãn, vừa khít)
// Đổi thành 'fill' nếu muốn kéo dãn ảnh để vừa khít với số ô
const SHIP_RESIZE_MODE = process.env.SHIP_RESIZE_MODE || 'contain'; // 'contain' hoặc 'fill'

// Đường dẫn
const INPUT_DIR = path.join(__dirname, '../../client/images/characters/input');
const OUTPUT_DIR = path.join(__dirname, '../../client/images/characters');

// Tạo output directory nếu chưa có
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Resize một ảnh
async function resizeImage(inputPath, outputPath, width, height) {
    try {
        await sharp(inputPath)
            .resize(width, height, {
                fit: 'contain', // Giữ nguyên tỷ lệ, không crop
                background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
            })
            .png()
            .toFile(outputPath);
        console.log(`✅ Resized: ${path.basename(outputPath)} (${width}x${height})`);
    } catch (error) {
        console.error(`❌ Error resizing ${inputPath}:`, error.message);
    }
}

// Xử lý tất cả ảnh trong folder
async function processCharacterFolder(characterFolder) {
    const characterName = path.basename(characterFolder);
    const outputCharacterDir = path.join(OUTPUT_DIR, characterName);
    
    // Tạo folder output cho character
    ensureDir(outputCharacterDir);
    ensureDir(path.join(outputCharacterDir, 'ships'));

    console.log(`\n📁 Processing: ${characterName}`);

    // Lấy tất cả file ảnh
    const files = fs.readdirSync(characterFolder).filter(file => 
        /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    if (files.length === 0) {
        console.log(`⚠️  No images found in ${characterName}`);
        return;
    }

    // Tìm avatar (file có tên chứa 'avatar' hoặc file đầu tiên)
    const avatarFile = files.find(f => /avatar/i.test(f)) || files[0];
    
    if (avatarFile) {
        const avatarPath = path.join(characterFolder, avatarFile);
        const baseName = path.parse(avatarFile).name;

        // Resize avatar thành các kích thước
        for (const [key, size] of Object.entries(SIZES)) {
            const outputPath = path.join(outputCharacterDir, `${baseName}-${size.suffix}.png`);
            await resizeImage(avatarPath, outputPath, size.width, size.height);
        }
    }

    // Xử lý ships (nếu có folder ships)
    const shipsDir = path.join(characterFolder, 'ships');
    if (fs.existsSync(shipsDir)) {
        const shipFiles = fs.readdirSync(shipsDir).filter(file => 
            /\.(jpg|jpeg|png|webp)$/i.test(file)
        );

        for (const shipFile of shipFiles) {
            const shipPath = path.join(shipsDir, shipFile);
            const shipName = path.parse(shipFile).name.toLowerCase();
            const outputShipPath = path.join(outputCharacterDir, 'ships', `${shipName}.png`);
            
            // Tìm kích thước tương ứng với tên tàu
            let shipLength = CELL_SIZE * 3; // Default: 3 ô (150px)
            
            if (shipName.includes('carrier')) {
                shipLength = SHIP_SIZES.carrier; // 250px (5 ô)
            } else if (shipName.includes('battleship')) {
                shipLength = SHIP_SIZES.battleship; // 200px (4 ô)
            } else if (shipName.includes('cruiser')) {
                shipLength = SHIP_SIZES.cruiser; // 150px (3 ô)
            } else if (shipName.includes('submarine')) {
                shipLength = SHIP_SIZES.submarine; // 150px (3 ô)
            } else if (shipName.includes('destroyer')) {
                shipLength = SHIP_SIZES.destroyer; // 100px (2 ô)
            }
            
            // Resize ship theo chiều dài (tàu có thể nằm ngang hoặc dọc)
            const metadata = await sharp(shipPath).metadata();
            const isWider = metadata.width > metadata.height;
            
            if (SHIP_RESIZE_MODE === 'fill') {
                // Mode FILL: Kéo dãn để vừa khít với số ô (có thể bị méo)
                if (isWider) {
                    // Tàu nằm ngang: width = shipLength, height = CELL_SIZE
                    await sharp(shipPath)
                        .resize(shipLength, CELL_SIZE, {
                            fit: 'fill' // Kéo dãn để vừa khít
                        })
                        .png()
                        .toFile(outputShipPath);
                } else {
                    // Tàu nằm dọc: width = CELL_SIZE, height = shipLength
                    await sharp(shipPath)
                        .resize(CELL_SIZE, shipLength, {
                            fit: 'fill' // Kéo dãn để vừa khít
                        })
                        .png()
                        .toFile(outputShipPath);
                }
                console.log(`✅ Ship: ${shipName}.png → ${shipLength}x${CELL_SIZE}px (${shipLength / CELL_SIZE} ô) [STRETCHED]`);
            } else {
                // Mode CONTAIN: Giữ nguyên tỷ lệ, không bị méo (mặc định)
                if (isWider) {
                    // Tàu nằm ngang: resize width = shipLength, height tự động
                    await sharp(shipPath)
                        .resize(shipLength, null, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .png()
                        .toFile(outputShipPath);
                } else {
                    // Tàu nằm dọc: resize height = shipLength, width tự động
                    await sharp(shipPath)
                        .resize(null, shipLength, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .png()
                        .toFile(outputShipPath);
                }
                console.log(`✅ Ship: ${shipName}.png → ${shipLength}px (${shipLength / CELL_SIZE} ô) [PROPORTIONAL]`);
            }
            
        }
    }
}

// Main function
async function main() {
    console.log('🖼️  Image Resizer Tool');
    console.log('====================\n');

    // Kiểm tra input directory
    if (!fs.existsSync(INPUT_DIR)) {
        console.log('📁 Creating input directory...');
        ensureDir(INPUT_DIR);
        console.log(`\n✅ Created: ${INPUT_DIR}`);
        console.log('\n📝 Instructions:');
        console.log('1. Create character folders in: client/images/characters/input/');
        console.log('2. Put your character images in each folder');
        console.log('3. Put ship images in: characterX/ships/');
        console.log('4. Run this script again: npm run resize-images');
        return;
    }

    // Lấy tất cả character folders
    const characterFolders = fs.readdirSync(INPUT_DIR)
        .map(folder => path.join(INPUT_DIR, folder))
        .filter(folder => fs.statSync(folder).isDirectory());

    if (characterFolders.length === 0) {
        console.log('⚠️  No character folders found in input directory');
        console.log(`📁 Put your images in: ${INPUT_DIR}`);
        return;
    }

    // Xử lý từng character
    for (const folder of characterFolders) {
        await processCharacterFolder(folder);
    }

    console.log('\n✅ Done! Resized images are in: client/images/characters/');
}

main().catch(console.error);

