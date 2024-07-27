const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const ws = new WebSocket(window.location.protocol === 'file:' ? 'ws://localhost:3000' : `ws://${window.location.host}`);

let players = [];
let stars = [];
let localPlayer = null;
let keys = {};

const shipTiers = [
  { name: 'Scout', color: '#fff' },
  { name: 'Fighter', color: '#ff0' },
  { name: 'Destroyer', color: '#0ff' },
  { name: 'Battleship', color: '#f0f' }
];

const SPEED = 5;

ws.onmessage = (event) => {
    const gameState = JSON.parse(event.data);
    if (gameState.type === 'dead') {
        showDeathScreen();
    } else {
        players = gameState.players;
        stars = gameState.stars;
        if (!localPlayer) {
            localPlayer = players.find(p => p.id === players[players.length - 1].id);
        } else {
            localPlayer = players.find(p => p.id === localPlayer.id);
        }
        updateLevelUI();
    }
};

function drawShip(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.strokeStyle = shipTiers[player.tier].color;
    ctx.stroke();
    ctx.restore();

    // Draw health bar
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - 25, player.y - 30, 50, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - 25, player.y - 30, (player.health / shipTiers[player.tier].health) * 50, 5);
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

    requestAnimationFrame(gameLoop);
}

function updateLevelUI() {
    if (localPlayer) {
        const levelInfo = document.getElementById('levelInfo');
        const expBar = document.getElementById('expBar');
        const shipName = document.getElementById('shipName');
        const healthInfo = document.getElementById('healthInfo');

        levelInfo.textContent = `Level: ${localPlayer.tier + 1}`;
        shipName.textContent = `Ship: ${shipTiers[localPlayer.tier].name}`;
        healthInfo.textContent = `Health: ${Math.max(0, Math.round(localPlayer.health))}`;

        const currentTier = shipTiers[localPlayer.tier];
        const nextTier = shipTiers[localPlayer.tier + 1];
        if (nextTier) {
            const progress = (localPlayer.exp - currentTier.expToNextLevel) / (nextTier.expToNextLevel - currentTier.expTo
NextLevel) * 100;
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
        ws.send(JSON.stringify({
            type: 'shoot'
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
        <button onclick="location.reload()">Restart</button>
    `;
    document.body.appendChild(deathScreen);
}

gameLoop();
