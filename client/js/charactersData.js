// Characters data for UI-only preview in Lobby
const CHARACTERS = [
    {
        id: 'character1',
        name: 'Captain Storm',
        displayName: 'Captain Storm',
        image: 'images/characters/character1/avatar-large.png',
        thumb: 'images/characters/character1/avatar-thumb.png',
        win: 'images/characters/character1/avatar-win.png',
        lose: 'images/characters/character1/avatar-lose.png',
        actionType: 'Airstrike',
        shipsFolder: 'images/characters/character1/ships'
    },
    {
        id: 'character2',
        name: 'Admiral Wave',
        displayName: 'Admiral Wave',
        image: 'images/characters/character2/avatar-large.png',
        thumb: 'images/characters/character2/avatar-thumb.png',
        win: 'images/characters/character2/avatar-win.png',
        lose: 'images/characters/character2/avatar-lose.png',
        actionType: 'Bombardment',
        shipsFolder: 'images/characters/character2/ships'
    },
    {
        id: 'character3',
        name: 'Commander Tide',
        displayName: 'Commander Tide',
        image: 'images/characters/character3/avatar-large.png',
        thumb: 'images/characters/character3/avatar-thumb.png',
        win: 'images/characters/character3/avatar-win.png',
        lose: 'images/characters/character3/avatar-lose.png',
        actionType: 'Torpedo Strike',
        shipsFolder: 'images/characters/character3/ships'
    }
];

// Ship names for display
const SHIP_NAMES = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
const SHIP_DISPLAY_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

// UI-only state for character preview (không lưu, không emit)
let selectedCharacterIndex = 0;

// Get current character for UI display
function getCurrentCharacter() {
    return CHARACTERS[selectedCharacterIndex];
}

// Switch character (UI-only, không ảnh hưởng game logic)
function switchCharacter(index) {
    if (index >= 0 && index < CHARACTERS.length) {
        selectedCharacterIndex = index;
        updateCharacterPreview();
    }
}

// Next/Prev helpers
function nextCharacter() {
    selectedCharacterIndex = (selectedCharacterIndex + 1) % CHARACTERS.length;
    updateCharacterPreview();
}

function prevCharacter() {
    selectedCharacterIndex = selectedCharacterIndex === 0 ? CHARACTERS.length - 1 : selectedCharacterIndex - 1;
    updateCharacterPreview();
}

// Update UI to show selected character
function updateCharacterPreview() {
    const character = getCurrentCharacter();
    
    // Update large portrait
    const myAvatar = document.getElementById('myCharacterAvatar');
    if (myAvatar) {
        myAvatar.src = character.image;
        myAvatar.alt = character.displayName;
    }
    
    // Update character name label
    const myCharName = document.getElementById('myCharacterName');
    if (myCharName) {
        myCharName.textContent = character.displayName;
    }
    
    // Update action type badge
    const myActionType = document.getElementById('myActionType');
    if (myActionType) {
        myActionType.textContent = character.actionType;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.char-thumb').forEach((thumb, idx) => {
        if (idx === selectedCharacterIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Initialize character selection UI
function initCharacterCarousel() {
    const selectionBar = document.getElementById('characterSelectionBar');
    if (!selectionBar) return;
    
    // Clear existing content
    selectionBar.innerHTML = '';
    
    // Create thumbnails
    CHARACTERS.forEach((char, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'char-thumb' + (index === selectedCharacterIndex ? ' active' : '');
        thumb.innerHTML = `
            <img src="${char.thumb}" alt="${char.displayName}">
            <span class="char-thumb-name">${char.displayName}</span>
        `;
        thumb.addEventListener('click', () => switchCharacter(index));
        selectionBar.appendChild(thumb);
    });
    
    // Initial preview update
    updateCharacterPreview();
}

// Get character by ID (e.g., 'character1', 'character2', 'character3')
function getCharacterById(id) {
    return CHARACTERS.find(char => char.id === id) || CHARACTERS[0];
}

// Get win avatar for a character by ID
function getCharacterWinAvatar(id) {
    const char = getCharacterById(id);
    return char?.win || char?.image || '';
}

// Get lose avatar for a character by ID
function getCharacterLoseAvatar(id) {
    const char = getCharacterById(id);
    return char?.lose || char?.image || '';
}

// Get character display name by ID
function getCharacterName(id) {
    const char = getCharacterById(id);
    return char?.displayName || char?.name || 'Unknown';
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHARACTERS, getCurrentCharacter, switchCharacter, nextCharacter, prevCharacter, getCharacterById, getCharacterWinAvatar, getCharacterLoseAvatar, getCharacterName };
}
