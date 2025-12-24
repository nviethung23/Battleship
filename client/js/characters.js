// Character Configuration
// File này chứa thông tin về các nhân vật trong game

const CHARACTERS = {
    character1: {
        id: 'character1',
        name: 'Captain Ba Kha', // Tên nhân vật
        displayName: 'Captain Ba Kha', // Tên hiển thị
        avatar: {
            large: 'images/characters/character1/avatar-large.png',
            medium: 'images/characters/character1/avatar-medium.png',
            small: 'images/characters/character1/avatar-small.png',
            thumb: 'images/characters/character1/avatar-thumb.png',
            win: 'images/characters/character1/avatar-win.png',
            lose: 'images/characters/character1/avatar-lose.png'
        },
        ships: {
            carrier: 'images/characters/character1/ships/carrier.png',
            battleship: 'images/characters/character1/ships/battleship.png',
            cruiser: 'images/characters/character1/ships/cruiser.png',
            submarine: 'images/characters/character1/ships/submarine.png',
            destroyer: 'images/characters/character1/ships/destroyer.png'
        },
        actionType: 'Airstrike', // Loại hành động (tùy chọn)
        description: 'Veteran naval commander' // Mô tả (tùy chọn)
    },
    character2: {
        id: 'character2',
        name: 'Sap rai da den',
        displayName: 'Sap rai da den',
        avatar: {
            large: 'images/characters/character2/avatar-large.png',
            medium: 'images/characters/character2/avatar-medium.png',
            small: 'images/characters/character2/avatar-small.png',
            thumb: 'images/characters/character2/avatar-thumb.png',
            win: 'images/characters/character2/avatar-win.png',
            lose: 'images/characters/character2/avatar-lose.png'
        },
        ships: {
            carrier: 'images/characters/character2/ships/carrier.png',
            battleship: 'images/characters/character2/ships/battleship.png',
            cruiser: 'images/characters/character2/ships/cruiser.png',
            submarine: 'images/characters/character2/ships/submarine.png',
            destroyer: 'images/characters/character2/ships/destroyer.png'
        },
        actionType: 'Bombardment',
        description: 'Tactical warfare expert'
    },
    character3: {
        id: 'character3',
        name: 'Gigachad', // Đổi tên ở đây
        displayName: 'Gigachad',
        avatar: {
            large: 'images/characters/character3/avatar-large.png',
            medium: 'images/characters/character3/avatar-medium.png',
            small: 'images/characters/character3/avatar-small.png',
            thumb: 'images/characters/character3/avatar-thumb.png',
            win: 'images/characters/character3/avatar-win.png',
            lose: 'images/characters/character3/avatar-lose.png'
        },
        ships: {
            carrier: 'images/characters/character3/ships/carrier.png',
            battleship: 'images/characters/character3/ships/battleship.png',
            cruiser: 'images/characters/character3/ships/cruiser.png',
            submarine: 'images/characters/character3/ships/submarine.png',
            destroyer: 'images/characters/character3/ships/destroyer.png'
        },
        actionType: 'Naval Strike',
        description: 'Elite fleet commander'
    }
};

// Helper functions
function getCharacterById(id) {
    return CHARACTERS[id] || null;
}

function getAllCharacters() {
    return Object.values(CHARACTERS);
}

function getCharacterName(id) {
    return CHARACTERS[id]?.displayName || CHARACTERS[id]?.name || 'Unknown';
}

function getCharacterAvatar(id, size = 'medium') {
    return CHARACTERS[id]?.avatar[size] || CHARACTERS[id]?.avatar.medium || '';
}

function getCharacterWinAvatar(id) {
    return CHARACTERS[id]?.avatar.win || CHARACTERS[id]?.avatar.large || '';
}

function getCharacterLoseAvatar(id) {
    return CHARACTERS[id]?.avatar.lose || CHARACTERS[id]?.avatar.large || '';
}

function getCharacterShips(id) {
    return CHARACTERS[id]?.ships || {};
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTERS, getCharacterById, getAllCharacters, getCharacterName, getCharacterAvatar, getCharacterShips };
}

