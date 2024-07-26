const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const players = new Map();
let nextPlayerId = 1;

wss.on('connection', (ws) => {
  const playerId = nextPlayerId++;
  const player = {
    id: playerId,
    x: Math.random() * 800,
    y: Math.random() * 600,
    angle: 0,
    health: 100
  };
  players.set(ws, player);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move') {
      player.x = data.x;
      player.y = data.y;
      player.angle = data.angle;
    } else if (data.type === 'shoot') {
      // Handle shooting logic here
    }
    broadcastGameState();
  });

  ws.on('close', () => {
    players.delete(ws);
    broadcastGameState();
  });

  broadcastGameState();
});

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
