const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const shipTiers = [
  { name: 'Scout', health: 100, damage: 10, expToNextLevel: 100 },
  { name: 'Fighter', health: 150, damage: 15, expToNextLevel: 250 },
  { name: 'Destroyer', health: 200, damage: 20, expToNextLevel: 500 },
  { name: 'Battleship', health: 300, damage: 30, expToNextLevel: Infinity }
];

const players = new Map();
let nextPlayerId = 1;
let stars = [];

function generateStars() {
  stars = [];
  for (let i = 0; i < 20; i++) {
    stars.push({
      x: Math.random() * 800,
      y: Math.random() * 600,
      value: Math.floor(Math.random() * 20) + 10
    });
  }
}

generateStars();

wss.on('connection', (ws) => {
  const playerId = nextPlayerId++;
  const player = {
    id: playerId,
    x: Math.random() * 800,
    y: Math.random() * 600,
    angle: 0,
    tier: 0,
    exp: 0,
    health: shipTiers[0].health,
    damage: shipTiers[0].damage,
    lastShot: 0
  };
  players.set(ws, player);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move') {
      player.x = data.x;
      player.y = data.y;
      checkStarCollision(player);
    } else if (data.type === 'rotate') {
      player.angle = data.angle;
    } else if (data.type === 'shoot') {
      handleShooting(player);
    }
    broadcastGameState();
  });

  ws.on('close', () => {
    players.delete(ws);
    broadcastGameState();
  });

  broadcastGameState();
});

function checkStarCollision(player) {
  stars = stars.filter(star => {
    const dx = player.x - star.x;
    const dy = player.y - star.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 20) {
      player.exp += star.value;
      if (player.exp >= shipTiers[player.tier].expToNextLevel && player.tier < shipTiers.length - 1) {
        player.tier++;
        player.health = shipTiers[player.tier].health;
        player.damage = shipTiers[player.tier].damage;
      }
      return false;
    }
    return true;
  });

  if (stars.length < 10) {
    generateStars();
  }
}

function handleShooting(player) {
  const now = Date.now();
  if (now - player.lastShot > 500) { // 500ms cooldown
    player.lastShot = now;
    const bullet = {
      x: player.x + Math.cos(player.angle) * 20,
      y: player.y + Math.sin(player.angle) * 20,
      angle: player.angle,
      damage: player.damage,
      playerId: player.id
    };
    checkBulletCollisions(bullet);
  }
}

function checkBulletCollisions(bullet) {
  players.forEach((targetPlayer, ws) => {
    if (targetPlayer.id !== bullet.playerId) {
      const dx = targetPlayer.x - bullet.x;
      const dy = targetPlayer.y - bullet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 20) {
        targetPlayer.health -= bullet.damage;
        if (targetPlayer.health <= 0) {
          ws.send(JSON.stringify({ type: 'dead' }));
          players.delete(ws);
        }
      }
    }
  });
}

function broadcastGameState() {
  const gameState = {
    players: Array.from(players.values()),
    stars: stars
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(gameState));
    }
  });
}

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
