// Cấu hình game
const GRID_SIZE = 10;
const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 }
];

class GameLogic {
    // Validate tọa độ có hợp lệ không
    static isValidCoordinate(row, col) {
        return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
    }

    // Validate vị trí đặt tàu
    static canPlaceShip(board, ship, row, col, isHorizontal) {
        const { size } = ship;

        for (let i = 0; i < size; i++) {
            const r = isHorizontal ? row : row + i;
            const c = isHorizontal ? col + i : col;

            // Check ra ngoài grid
            if (!this.isValidCoordinate(r, c)) {
                return false;
            }

            // Check ô đã có tàu
            if (board[r][c] !== null) {
                return false;
            }
        }

        return true;
    }

    // Đặt tàu lên board
    static placeShip(board, ship, row, col, isHorizontal) {
        const { name, size } = ship;

        if (!this.canPlaceShip(board, ship, row, col, isHorizontal)) {
            return false;
        }

        const shipCells = [];
        for (let i = 0; i < size; i++) {
            const r = isHorizontal ? row : row + i;
            const c = isHorizontal ? col + i : col;
            board[r][c] = name;
            shipCells.push({ row: r, col: c });
        }

        return shipCells;
    }

    // Tạo board trống
    static createEmptyBoard() {
        return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    }

    // Validate board đã đặt đủ tàu chưa
    static isValidBoard(ships) {
        if (ships.length !== SHIPS.length) {
            return false;
        }

        // Check mỗi loại tàu
        for (const shipConfig of SHIPS) {
            const found = ships.find(s => s.name === shipConfig.name && s.cells.length === shipConfig.size);
            if (!found) {
                return false;
            }
        }

        return true;
    }

    // Xử lý attack
    static processAttack(board, ships, row, col, attackedCells) {
        // Check đã bắn ô này chưa
        if (attackedCells.some(cell => cell.row === row && cell.col === col)) {
            return {
                valid: false,
                error: 'Already attacked this cell'
            };
        }

        const cellValue = board[row][col];
        const isHit = cellValue !== null;

        const result = {
            valid: true,
            hit: isHit,
            row,
            col,
            shipName: cellValue,
            sunk: false,
            shipSunk: null,
            shipCells: null
        };

        if (isHit) {
            // Check xem tàu có bị chìm không
            const ship = ships.find(s => s.name === cellValue);
            if (ship) {
                ship.hits = (ship.hits || 0) + 1;
                if (Array.isArray(ship.cells)) {
                    result.shipCells = ship.cells.map(c => ({ row: c.row, col: c.col }));
                }
                if (ship.hits === ship.cells.length) {
                    result.sunk = true;
                    result.shipSunk = ship.name;
                }
            }
        }

        return result;
    }

    // Check game over
    static isGameOver(ships) {
        return ships.every(ship => ship.hits === ship.cells.length);
    }

    // Tạo board ẩn để gửi cho đối thủ (không show vị trí tàu)
    static getHiddenBoard(board, attackedCells) {
        const hidden = this.createEmptyBoard();
        
        attackedCells.forEach(({ row, col }) => {
            hidden[row][col] = board[row][col] !== null ? 'hit' : 'miss';
        });

        return hidden;
    }
}

module.exports = { GameLogic, SHIPS, GRID_SIZE };

