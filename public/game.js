// Import constants from the global GAME_CONSTANTS object
const {
    MAP,
    SHIP_TIERS,
    BULLET_SPEED,
    MINIMAP_SIZE,
    LEVEL_UP_MESSAGE_DURATION
} = window.GAME_CONSTANTS || {};

// Fallback values if GAME_CONSTANTS is not defined
const defaultConstants = {
    MAP: { width: 4000, height: 3000 },
    SHIP_TIERS: [
        { name: 'Scout', color: '#fff', health: 100, trait: 'Fast Reload', expToNextLevel: 100 },
        { name: 'Fighter', color: '#ff0', health: 150, trait: 'Triple Shot', expToNextLevel: 250 },
        { name: 'Destroyer', color: '#0ff', health: 200, trait: 'Shield', expToNextLevel: 500 },
        { name: 'Battleship', color: '#f0f', health: 300, trait: 'Heavy Bullet', expToNextLevel: 1000 },
        { name: 'Dreadnought', color: '#0f0', health: 500, trait: 'Rear Shot', expToNextLevel: 2000 },
        { name: 'Titan', color: '#f00', health: 1000, trait: 'All Traits', expToNextLevel: Infinity }
    ],
    BULLET_SPEED: 10,
    MINIMAP_SIZE: 150,
    LEVEL_UP_MESSAGE_DURATION: 180
};

// Use the imported constants or fallback to default values
const gameMap = MAP || defaultConstants.MAP;
const shipTiers = SHIP_TIERS || defaultConstants.SHIP_TIERS;
const bulletSpeed = BULLET_SPEED || defaultConstants.BULLET_SPEED;
const minimapSize = MINIMAP_SIZE || defaultConstants.MINIMAP_SIZE;
const levelUpMessageDuration = LEVEL_UP_MESSAGE_DURATION || defaultConstants.LEVEL_UP_MESSAGE_DURATION;

const SPEED = 3; // Reduced speed from 5 to 3

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let camera = {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight
};

const introScreen = document.getElementById('introScreen');
const gameContainer = document.getElementById('gameContainer');
const usernameInput = document.getElementById('usernameInput');
const startButton = document.getElementById('startButton');

let ws;
let players = [];
let stars = [];
let localPlayer = null;
let keys = {};
let username = '';

startButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
        startGame();
    } else {
        alert('Please enter a username');
    }
});

function startGame() {
    introScreen.style.display = 'none';
    gameContainer.style.display = 'block';

    connectWebSocket();
}

function connectWebSocket() {
    ws = new WebSocket(window.location.protocol === 'file:' ? 'ws://localhost:3000' : `ws://192.168.86.234:3000`);
    // ws = new WebSocket("wss://192.168.86.234:3000");
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', username: username }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'dead') {
            showDeathScreen();
        } else if (data.type === 'gameState') {
            players = data.players;
            stars = data.stars;
            bullets = data.bullets;
            if (!localPlayer) {
                localPlayer = players.find(p => p.username === username);
            } else {
                localPlayer = players.find(p => p.id === localPlayer.id);
            }
            updateLevelUI();
        } else if (data.type === 'hit') {
            if (localPlayer && data.id === localPlayer.id) {
                localPlayer.health = data.health;
                localPlayer.shieldHealth = data.shieldHealth;
                updateLevelUI();
            }
        } else if (data.type === 'levelUp') {
            showLevelUpMessage(data.newTier, data.shipName);
        } else if (data.type === 'respawn') {
            localPlayer = data.player;
            hideDeathScreen();
            updateLevelUI();
        }
    };

    gameLoop();
}

function drawShip(player) {
    if (isOnScreen(player)) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        
        const color = SHIP_TIERS[player.tier].color;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'white';

        // Draw the shield if it's active
        if (player.shieldHealth > 0) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fillStyle = '#00FFFF';
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Draw ship based on tier
        switch(player.tier) {
            case 0: // Scout
                drawScout();
                break;
            case 1: // Fighter
                drawFighter();
                break;
            case 2: // Destroyer
                drawDestroyer();
                break;
            case 3: // Battleship
                drawBattleship();
                break;
            case 4: // Dreadnought
                drawDreadnought();
                break;
            case 5: // Titan
                drawTitan();
                break;
        }

        ctx.restore();

        // Draw health bar
        const healthBarWidth = 50;
        const healthBarHeight = 5;
        const healthBarY = player.y - 30;
        
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = 'green';
        const currentHealthWidth = (player.health / SHIP_TIERS[player.tier].health) * healthBarWidth;
        ctx.fillRect(player.x - healthBarWidth / 2, healthBarY, currentHealthWidth, healthBarHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.username, player.x, healthBarY - 5);
    }
}

function drawScout() {
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawFighter() {
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-15, 5);
    ctx.lineTo(-15, -5);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawDestroyer() {
    // Draw the ship
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(10, 15);
    ctx.lineTo(-20, 5);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-20, -5);
    ctx.lineTo(10, -15);
    ctx.closePath();
    ctx.fillStyle = SHIP_TIERS[2].color; // Destroyer color
    ctx.fill();
    ctx.stroke();
}

function drawBattleship() {
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(15, 20);
    ctx.lineTo(-25, 10);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-25, -10);
    ctx.lineTo(15, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawDreadnought() {
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(20, 25);
    ctx.lineTo(-30, 15);
    ctx.lineTo(-25, 0);
    ctx.lineTo(-30, -15);
    ctx.lineTo(20, -25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawTitan() {
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(25, 30);
    ctx.lineTo(-35, 20);
    ctx.lineTo(-30, 0);
    ctx.lineTo(-35, -20);
    ctx.lineTo(25, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawStar(star) {
    if (isOnScreen(star)) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(star.x, star.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function isOnScreen(object) {
    const margin = 100; // Increased margin to account for player size and ensure visibility near screen edges
    return object.x >= camera.x - margin && object.x <= camera.x + camera.width + margin &&
           object.y >= camera.y - margin && object.y <= camera.y + camera.height + margin;
}

function gameLoop() {
    handleMovement();
    updateCamera();
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    stars.forEach(star => drawStar(star));
    players.forEach(player => drawShip(player));
    if (bullets && bullets.length > 0) {
        bullets.forEach(bullet => drawBullet(bullet));
    }

    ctx.restore();

    drawLevelUpMessage();
    drawMinimap();

    requestAnimationFrame(gameLoop);
}

// Make sure there are no extra closing braces here

// Disconnect screen function removed

function updateCamera() {
    if (localPlayer) {
        camera.x = localPlayer.x - canvas.width / 2;
        camera.y = localPlayer.y - canvas.height / 2;

        camera.x = Math.max(0, Math.min(camera.x, MAP.width - canvas.width));
        camera.y = Math.max(0, Math.min(camera.y, MAP.height - canvas.height));
    }
}

function drawMinimap() {
    const minimapScale = MINIMAP_SIZE / Math.max(MAP.width, MAP.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - MINIMAP_SIZE - 10, canvas.height - MINIMAP_SIZE - 10, MINIMAP_SIZE, MINIMAP_SIZE);
    
    players.forEach(player => {
        ctx.fillStyle = player === localPlayer ? '#00ff00' : '#ff0000';
        ctx.fillRect(
            canvas.width - MINIMAP_SIZE - 10 + player.x * minimapScale,
            canvas.height - MINIMAP_SIZE - 10 + player.y * minimapScale,
            3, 3
        );
    });

    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(
        canvas.width - MINIMAP_SIZE - 10 + camera.x * minimapScale,
        canvas.height - MINIMAP_SIZE - 10 + camera.y * minimapScale,
        canvas.width * minimapScale,
        canvas.height * minimapScale
    );
}

let levelUpMessage = null;
let levelUpMessageTimer = 0;

function showLevelUpMessage(newTier, shipName) {
    levelUpMessage = `Leveled up to ${shipName}!`;
    levelUpMessageTimer = LEVEL_UP_MESSAGE_DURATION;
}

function drawLevelUpMessage() {
    if (levelUpMessage && levelUpMessageTimer > 0) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(levelUpMessage, canvas.width / 2, 50);
        levelUpMessageTimer--;
        if (levelUpMessageTimer === 0) {
            levelUpMessage = null;
        }
    }
}

function updateLevelUI() {
    if (localPlayer) {
        const levelInfo = document.getElementById('levelInfo');
        const expBar = document.getElementById('expBar');
        const shipName = document.getElementById('shipName');
        const healthInfo = document.getElementById('healthInfo');
        const shieldInfo = document.getElementById('shieldInfo');

        levelInfo.textContent = `Level: ${localPlayer.tier + 1}`;
        shipName.textContent = `Ship: ${SHIP_TIERS[localPlayer.tier].name} (${SHIP_TIERS[localPlayer.tier].trait})`;
        healthInfo.textContent = `Health: ${Math.max(0, Math.round(localPlayer.health))}`;
        
        if (localPlayer.shieldHealth > 0) {
            shieldInfo.textContent = `Shield: ${Math.max(0, Math.round(localPlayer.shieldHealth))}`;
            shieldInfo.style.display = 'block';
        } else {
            shieldInfo.style.display = 'none';
        }

        const currentTier = SHIP_TIERS[localPlayer.tier];
        const nextTier = SHIP_TIERS[localPlayer.tier + 1];
        if (nextTier) {
            const progress = (localPlayer.exp - currentTier.expToNextLevel) / (nextTier.expToNextLevel - currentTier.expToNextLevel) * 100;
            expBar.style.width = `${progress}%`;
        } else {
            expBar.style.width = '100%';
        }
    }
}

function handleMovement() {
    if (localPlayer && mousePosition) {
        const dx = mousePosition.x - localPlayer.x;
        const dy = mousePosition.y - localPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate the movement vector
        const moveX = (dx / distance) * SPEED;
        const moveY = (dy / distance) * SPEED;

        // Update the player's position
        localPlayer.x += moveX;
        localPlayer.y += moveY;

        // Prevent the ship from going past the edge of the map
        localPlayer.x = Math.max(20, Math.min(localPlayer.x, MAP.width - 20));
        localPlayer.y = Math.max(20, Math.min(localPlayer.y, MAP.height - 20));

        // Send the updated position to the server
        ws.send(JSON.stringify({
            type: 'move',
            x: localPlayer.x,
            y: localPlayer.y,
            angle: localPlayer.angle
        }));
    }
}

function shoot() {
    if (localPlayer) {
        const bulletX = localPlayer.x + Math.cos(localPlayer.angle) * 20;
        const bulletY = localPlayer.y + Math.sin(localPlayer.angle) * 20;
        ws.send(JSON.stringify({
            type: 'shoot',
            x: bulletX,
            y: bulletY,
            angle: localPlayer.angle,
            speed: BULLET_SPEED
        }));
    }
}

let mousePosition = null;

canvas.addEventListener('mousemove', (event) => {
    if (localPlayer) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + camera.x;
        const y = event.clientY - rect.top + camera.y;
        mousePosition = { x, y };
        localPlayer.angle = Math.atan2(y - localPlayer.y, x - localPlayer.x);

        ws.send(JSON.stringify({
            type: 'rotate',
            angle: localPlayer.angle
        }));
    }
});

canvas.addEventListener('click', shoot);

let bullets = [];

function drawBullet(bullet) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size || 3, 0, Math.PI * 2);
    ctx.fill();
}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        shoot();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

function showDeathScreen() {
    const deathScreen = document.createElement('div');
    deathScreen.id = 'deathScreen';
    deathScreen.innerHTML = `
        <h1>You Died!</h1>
        <button id="restartButton">Restart</button>
    `;
    document.body.appendChild(deathScreen);

    document.getElementById('restartButton').addEventListener('click', () => {
        document.body.removeChild(deathScreen);
        localPlayer = null;
        players = [];
        stars = [];
        bullets = [];
        connectWebSocket();
    });
}

gameLoop();
function hideDeathScreen() {
    const deathScreen = document.getElementById('deathScreen');
    if (deathScreen) {
        document.body.removeChild(deathScreen);
    }
}
