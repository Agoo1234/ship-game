const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const ws = new WebSocket(`ws://${window.location.host}`);

let players = [];
let localPlayer = null;

const shipTiers = [
  { name: 'Scout', color: '#fff' },
  { name: 'Fighter', color: '#ff0' },
  { name: 'Destroyer', color: '#0ff' },
  { name: 'Battleship', color: '#f0f' }
];

ws.onmessage = (event) => {
    players = JSON.parse(event.data);
    if (!localPlayer) {
        localPlayer = players.find(p => p.id === players[players.length - 1].id);
    }
    updateLevelUI();
};

function drawShip(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-10, 10);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.strokeStyle = shipTiers[player.tier].color;
    ctx.stroke();
    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    players.forEach(player => {
        drawShip(player);
    });

    requestAnimationFrame(gameLoop);
}

function updateLevelUI() {
    if (localPlayer) {
        const levelInfo = document.getElementById('levelInfo');
        const expBar = document.getElementById('expBar');
        const shipName = document.getElementById('shipName');

        levelInfo.textContent = `Level: ${localPlayer.tier + 1}`;
        shipName.textContent = `Ship: ${shipTiers[localPlayer.tier].name}`;

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

canvas.addEventListener('mousemove', (event) => {
    if (localPlayer) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const angle = Math.atan2(y - localPlayer.y, x - localPlayer.x);

        ws.send(JSON.stringify({
            type: 'move',
            x: x,
            y: y,
            angle: angle
        }));
    }
});

canvas.addEventListener('click', () => {
    if (localPlayer) {
        ws.send(JSON.stringify({
            type: 'shoot'
        }));
    }
});

gameLoop();
