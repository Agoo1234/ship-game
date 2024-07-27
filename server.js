const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const shipTiers = [
  { name: 'Scout', health: 100, damage: 10, expToNextLevel: 100, trait: 'fastReload' },
  { name: 'Fighter', health: 150, damage: 15, expToNextLevel: 250, trait: 'doubleBullet' },
  { name: 'Destroyer', health: 200, damage: 20, expToNextLevel: 500, trait: 'shield' },
  { name: 'Battleship', health: 300, damage: 30, expToNextLevel: 1000, trait: 'heavyBullet' },
  { name: 'Dreadnought', health: 500, damage: 40, expToNextLevel: 2000, trait: 'rearShot' },
  { name: 'Titan', health: 1000, damage: 50, expToNextLevel: Infinity, trait: 'allTraits' }
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
        lastShot: 0,
        trait: shipTiers[0].trait
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
        player.trait = shipTiers[player.tier].trait;
        console.log(`Player ${player.username} leveled up to tier ${player.tier} (${shipTiers[player.tier].name}), new trait: ${player.trait}`);
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
  const cooldown = player.trait === 'fastReload' || player.trait === 'allTraits' ? 250 : 500; // 250ms cooldown for fastReload trait
  if (now - player.lastShot > cooldown) {
    player.lastShot = now;
    const bulletData = {
      x: data.x,
      y: data.y,
      angle: data.angle,
      speed: data.speed,
      damage: player.trait === 'heavyBullet' || player.trait === 'allTraits' ? player.damage * 1.5 : player.damage,
      playerId: player.id
    };
    bullets.push(bulletData);

    console.log(`Player ${player.username} (Tier: ${player.tier}, Trait: ${player.trait}) fired a bullet`);

    if (player.trait === 'doubleBullet' || player.trait === 'allTraits') {
      console.log(`Double bullet trait activated for player ${player.username}`);
      bullets.push({...bulletData, angle: bulletData.angle + Math.PI / 12});
      bullets.push({...bulletData, angle: bulletData.angle - Math.PI / 12});
    }

    if (player.trait === 'rearShot' || player.trait === 'allTraits') {
      console.log(`Rear shot trait activated for player ${player.username}`);
      bullets.push({...bulletData, angle: bulletData.angle + Math.PI});
    }
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
          if (player.trait !== 'shield' || Math.random() > 0.3) { // 30% chance to block for shield trait
            player.health -= bullet.damage;
            if (player.health <= 0) {
              const shooter = Array.from(players.values()).find(p => p.id === bullet.playerId);
              if (shooter) {
                shooter.exp += 50; // Give XP for killing a player
                if (shooter.exp >= shipTiers[shooter.tier].expToNextLevel && shooter.tier < shipTiers.length - 1) {
                  shooter.tier++;
                  shooter.health = shipTiers[shooter.tier].health;
                  shooter.damage = shipTiers[shooter.tier].damage;
                  shooter.trait = shipTiers[shooter.tier].trait;
                  const shooterWs = Array.from(players.entries()).find(([_, p]) => p.id === shooter.id)[0];
                  shooterWs.send(JSON.stringify({ type: 'levelUp', newTier: shooter.tier, shipName: shipTiers[shooter.tier].name }));
                }
              }
              ws.send(JSON.stringify({ type: 'dead' }));
              players.delete(ws);
            } else {
              ws.send(JSON.stringify({ type: 'hit', health: player.health }));
            }
            hit = true;
          }
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
