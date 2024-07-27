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
    damage: shipTiers[0].damage
  };
  players.set(ws, player);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move') {
      player.x = data.x;
      player.y = data.y;
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

function handleShooting(player) {
  // Simplified shooting logic: award exp for each shot
  player.exp += 10;
  if (player.exp >= shipTiers[player.tier].expToNextLevel && player.tier < shipTiers.length - 1) {
    player.tier++;
    player.health = shipTiers[player.tier].health;
    player.damage = shipTiers[player.tier].damage;
  }
}

function broadcastGameState() {
  const gameState = Array.from(players.values());
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
