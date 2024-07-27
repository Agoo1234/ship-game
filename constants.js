// Game constants
const GAME_CONSTANTS = {
    SPEED: 5,
    MAP: {
        width: 4000,
        height: 3000
    },
    SHIP_TIERS: [
        { name: 'Scout', color: '#fff', health: 100, trait: 'Fast Reload', expToNextLevel: 100 },
        { name: 'Fighter', color: '#ff0', health: 150, trait: 'Double Shot', expToNextLevel: 250 },
        { name: 'Destroyer', color: '#0ff', health: 200, trait: 'Shield', expToNextLevel: 500 },
        { name: 'Battleship', color: '#f0f', health: 300, trait: 'Heavy Bullet', expToNextLevel: 1000 },
        { name: 'Dreadnought', color: '#0f0', health: 500, trait: 'Rear Shot', expToNextLevel: 2000 },
        { name: 'Titan', color: '#f00', health: 1000, trait: 'All Traits', expToNextLevel: Infinity }
    ],
    BULLET_SPEED: 10,
    MINIMAP_SIZE: 150,
    LEVEL_UP_MESSAGE_DURATION: 180 // 3 seconds at 60 fps
};

// Make GAME_CONSTANTS available globally
if (typeof window !== 'undefined') {
    window.GAME_CONSTANTS = GAME_CONSTANTS;
} else {
    module.exports = GAME_CONSTANTS;
}
