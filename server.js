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
let bullets = [];

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
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'join') {
      const playerId = nextPlayerId++;
      const player = {
        id: playerId,
        username: data.username,
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
      broadcastGameState();
    } else if (data.type === 'move') {
      const player = players.get(ws);
      player.x = data.x;
      player.y = data.y;
      checkStarCollision(player);
    } else if (data.type === 'rotate') {
      const player = players.get(ws);
      player.angle = data.angle;
    } else if (data.type === 'shoot') {
      const player = players.get(ws);
      handleShooting(player, data);
    }
    updateBullets();
    broadcastGameState();
  });

  ws.on('close', () => {
    players.delete(ws);
    broadcastGameState();
  });
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
        const ws = Array.from(players.entries()).find(([_, p]) => p.id === player.id)[0];
        ws.send(JSON.stringify({ type: 'levelUp', newTier: player.tier, shipName: shipTiers[player.tier].name }));
      }
      return false;
    }
    return true;
  });

  if (stars.length < 10) {
    generateStars();
  }
}

function handleShooting(player, data) {
  const now = Date.now();
  if (now - player.lastShot > 500) { // 500ms cooldown
    player.lastShot = now;
    const bullet = {
      x: data.x,
      y: data.y,
      angle: data.angle,
      speed: data.speed,
      damage: player.damage,
      playerId: player.id
    };
    bullets.push(bullet);
  }
}

function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
    
    if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
      return false;
    }
    
    let hit = false;
    players.forEach((player, ws) => {
      if (player.id !== bullet.playerId) {
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 20) {
          player.health -= bullet.damage;
          if (player.health <= 0) {
            ws.send(JSON.stringify({ type: 'dead' }));
            players.delete(ws);
          } else {
            ws.send(JSON.stringify({ type: 'hit', health: player.health }));
          }
          hit = true;
        }
      }
    });
    
    return !hit;
  });
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
    type: 'gameState',
    players: Array.from(players.values()),
    stars: stars,
    bullets: bullets
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(gameState));
    }
  });
}

setInterval(() => {
  updateBullets();
  broadcastGameState();
}, 1000 / 60); // 60 FPS

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
