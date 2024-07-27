const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

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

const shipTiers = [
  { name: 'Scout', color: '#fff', health: 100, trait: 'Fast Reload' },
  { name: 'Fighter', color: '#ff0', health: 150, trait: 'Double Shot' },
  { name: 'Destroyer', color: '#0ff', health: 200, trait: 'Shield' },
  { name: 'Battleship', color: '#f0f', health: 300, trait: 'Heavy Bullet' },
  { name: 'Dreadnought', color: '#0f0', health: 500, trait: 'Rear Shot' },
  { name: 'Titan', color: '#f00', health: 1000, trait: 'All Traits' }
];

const SPEED = 5;

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
    ws = new WebSocket(window.location.protocol === 'file:' ? 'ws://localhost:3000' : `ws://${window.location.host}`);

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
                updateLevelUI();
            }
        } else if (data.type === 'levelUp') {
            showLevelUpMessage(data.newTier, data.shipName);
        }
    };

    gameLoop();
}

function drawShip(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    const color = shipTiers[player.tier].color;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'white';

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
    const currentHealthWidth = (player.health / shipTiers[player.tier].health) * healthBarWidth;
    ctx.fillRect(player.x - healthBarWidth / 2, healthBarY, currentHealthWidth, healthBarHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.username, player.x, healthBarY - 5);
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
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(10, 15);
    ctx.lineTo(-20, 5);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-20, -5);
    ctx.lineTo(10, -15);
    ctx.closePath();
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
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(star.x, star.y, 5, 0, Math.PI * 2);
    ctx.fill();
}

function gameLoop() {
    handleMovement();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => drawStar(star));
    players.forEach(player => drawShip(player));
    if (bullets && bullets.length > 0) {
        bullets.forEach(bullet => drawBullet(bullet));
    }

    drawLevelUpMessage();

    requestAnimationFrame(gameLoop);
}

let levelUpMessage = null;
let levelUpMessageTimer = 0;

function showLevelUpMessage(newTier, shipName) {
    levelUpMessage = `Leveled up to ${shipName}!`;
    levelUpMessageTimer = 180; // Show message for 3 seconds (60 fps * 3)
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

        levelInfo.textContent = `Level: ${localPlayer.tier + 1}`;
        shipName.textContent = `Ship: ${shipTiers[localPlayer.tier].name} (${shipTiers[localPlayer.tier].trait})`;
        healthInfo.textContent = `Health: ${Math.max(0, Math.round(localPlayer.health))}`;

        const currentTier = shipTiers[localPlayer.tier];
        const nextTier = shipTiers[localPlayer.tier + 1];
        if (nextTier) {
            const progress = (localPlayer.exp - currentTier.expToNextLevel) / (nextTier.expToNextLevel - currentTier.expToNextLevel) * 100;
            expBar.style.width = `${progress}%`;
        } else {
            expBar.style.width = '100%';
        }
    }
}

function handleMovement() {
    if (localPlayer) {
        let dx = 0;
        let dy = 0;
        if (keys['w']) dy -= SPEED;
        if (keys['s']) dy += SPEED;
        if (keys['a']) dx -= SPEED;
        if (keys['d']) dx += SPEED;

        if (dx !== 0 || dy !== 0) {
            localPlayer.x += dx;
            localPlayer.y += dy;
            ws.send(JSON.stringify({
                type: 'move',
                x: localPlayer.x,
                y: localPlayer.y,
                angle: localPlayer.angle
            }));
        }
    }
}

function shoot() {
    if (localPlayer) {
        const bulletSpeed = 10;
        const bulletX = localPlayer.x + Math.cos(localPlayer.angle) * 20;
        const bulletY = localPlayer.y + Math.sin(localPlayer.angle) * 20;
        ws.send(JSON.stringify({
            type: 'shoot',
            x: bulletX,
            y: bulletY,
            angle: localPlayer.angle,
            speed: bulletSpeed
        }));
    }
}

canvas.addEventListener('mousemove', (event) => {
    if (localPlayer) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
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
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
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
