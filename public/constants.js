// Game constants
const SPEED = 5;
const MAP = {
    width: 4000,
    height: 3000
};

// Ship tiers
const SHIP_TIERS = [
    { name: 'Scout', color: '#fff', health: 100, trait: 'Fast Reload', expToNextLevel: 100 },
    { name: 'Fighter', color: '#ff0', health: 150, trait: 'Triple Shot', expToNextLevel: 250 },
    { name: 'Destroyer', color: '#0ff', health: 200, trait: 'Shield', expToNextLevel: 500 },
    { name: 'Battleship', color: '#f0f', health: 300, trait: 'Heavy Bullet', expToNextLevel: 1000 },
    { name: 'Dreadnought', color: '#0f0', health: 500, trait: 'Rear Shot', expToNextLevel: 2000 },
    { name: 'Titan', color: '#f00', health: 1000, trait: 'All Traits', expToNextLevel: Infinity }
];

// Other constants
const BULLET_SPEED = 10;
const MINIMAP_SIZE = 150;
const LEVEL_UP_MESSAGE_DURATION = 180; // 3 seconds at 60 fps

// Make constants available globally or export them for Node.js
if (typeof window !== 'undefined') {
    window.SPEED = SPEED;
    window.MAP = MAP;
    window.SHIP_TIERS = SHIP_TIERS;
    window.BULLET_SPEED = BULLET_SPEED;
    window.MINIMAP_SIZE = MINIMAP_SIZE;
    window.LEVEL_UP_MESSAGE_DURATION = LEVEL_UP_MESSAGE_DURATION;
} else {
    module.exports = {
        SPEED,
        MAP,
        SHIP_TIERS,
        BULLET_SPEED,
        MINIMAP_SIZE,
        LEVEL_UP_MESSAGE_DURATION
    };
}
