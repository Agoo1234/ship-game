const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const ws = new WebSocket(`ws://${window.location.host}`);

let players = [];
let localPlayer = null;

ws.onmessage = (event) => {
    players = JSON.parse(event.data);
    if (!localPlayer) {
        localPlayer = players.find(p => p.id === players[players.length - 1].id);
    }
};

function drawShip(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-10, 10);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
}

function gameLoop() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    players.forEach(player => {
        drawShip(player.x, player.y, player.angle);
    });

    requestAnimationFrame(gameLoop);
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
