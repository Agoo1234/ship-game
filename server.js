const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { MAP, SHIP_TIERS } = require('./public/constants.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const players = new Map();
let nextPlayerId = 1;
let stars = [];
let bullets = [];

function generateStars() {
  stars = [];
  const numStars = Math.floor((MAP.width * MAP.height) / 40000); // Adjust star density
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * MAP.width,
      y: Math.random() * MAP.height,
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
        x: Math.random() * MAP.width,
        y: Math.random() * MAP.height,
        angle: 0,
        tier: 0,
        exp: 0,
        health: SHIP_TIERS[0].health,
        damage: SHIP_TIERS[0].damage,
        lastShot: 0,
        trait: SHIP_TIERS[0].trait,
        shieldHealth: 0
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
      if (player.exp >= SHIP_TIERS[player.tier].expToNextLevel && player.tier < SHIP_TIERS.length - 1) {
        player.tier++;
        player.health = SHIP_TIERS[player.tier].health;
        player.damage = SHIP_TIERS[player.tier].damage;
        player.trait = SHIP_TIERS[player.tier].trait;
        console.log(`Player ${player.username} leveled up to tier ${player.tier} (${SHIP_TIERS[player.tier].name}), new trait: ${player.trait}`);
        const ws = Array.from(players.entries()).find(([_, p]) => p.id === player.id)[0];
        ws.send(JSON.stringify({ type: 'levelUp', newTier: player.tier, shipName: SHIP_TIERS[player.tier].name }));
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
  const cooldown = player.trait === 'Fast Reload' || player.trait === 'All Traits' ? 250 : 500; // 250ms cooldown for Fast Reload trait
  if (now - player.lastShot > cooldown) {
    player.lastShot = now;
    const baseDamage = player.damage || SHIP_TIERS[player.tier].damage;
    const bulletDamage = player.trait === 'Heavy Bullet' || player.trait === 'All Traits' ? baseDamage * 1.5 : baseDamage;
    const finalDamage = Math.max(1, Math.round(bulletDamage)); // Ensure damage is at least 1 and rounded
    const bulletData = {
      x: data.x,
      y: data.y,
      angle: data.angle,
      speed: data.speed,
      damage: finalDamage,
      playerId: player.id,
      size: player.trait === 'Heavy Bullet' || player.trait === 'All Traits' ? 6 : 3
    };
    bullets.push(bulletData);

    console.log(`Player ${player.username} (Tier: ${player.tier}, Trait: ${player.trait}) fired a bullet with damage: ${finalDamage}`);

    if (player.trait === 'Double Shot' || player.trait === 'All Traits') {
      console.log(`Double Shot trait activated for player ${player.username}`);
      bullets.push({...bulletData, angle: bulletData.angle + Math.PI / 12});
      bullets.push({...bulletData, angle: bulletData.angle - Math.PI / 12});
    }

    if (player.trait === 'Rear Shot' || player.trait === 'All Traits') {
      console.log(`Rear Shot trait activated for player ${player.username}`);
      bullets.push({...bulletData, angle: bulletData.angle + Math.PI});
    }
  }
}

function updateBullets() {
  bullets = bullets.filter(bullet => {
    const dx = Math.cos(bullet.angle) * bullet.speed;
    const dy = Math.sin(bullet.angle) * bullet.speed;
    bullet.x += dx;
    bullet.y += dy;
    
    if (bullet.x < 0 || bullet.x > MAP.width || bullet.y < 0 || bullet.y > MAP.height) {
      return false;
    }
    
    let hit = false;
    players.forEach((player, ws) => {
      if (player.id !== bullet.playerId) {
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 20) {
          handleDamage(player, bullet.damage, ws);
          const shooter = Array.from(players.values()).find(p => p.id === bullet.playerId);
          if (shooter && player.health <= 0) {
            shooter.exp += 50; // Give XP for killing a player
            if (shooter.exp >= SHIP_TIERS[shooter.tier].expToNextLevel && shooter.tier < SHIP_TIERS.length - 1) {
              handleLevelUp(shooter);
              const shooterWs = Array.from(players.entries()).find(([_, p]) => p.id === shooter.id)[0];
              shooterWs.send(JSON.stringify({ type: 'levelUp', newTier: shooter.tier, shipName: SHIP_TIERS[shooter.tier].name }));
            }
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
        if (targetPlayer.shieldHealth > 0) {
          targetPlayer.shieldHealth -= bullet.damage;
          if (targetPlayer.shieldHealth <= 0) {
            targetPlayer.shieldHealth = 0;
          }
        } else {
          targetPlayer.health -= bullet.damage;
        }
        if (targetPlayer.health <= 0) {
          ws.send(JSON.stringify({ type: 'dead' }));
          players.delete(ws);
        } else {
          ws.send(JSON.stringify({ 
            type: 'hit', 
            health: targetPlayer.health, 
            shieldHealth: targetPlayer.shieldHealth 
          }));
        }
      }
    }
  });
}

function handleDamage(player, damage, ws) {
  if (!damage || isNaN(damage)) {
    console.error(`Invalid damage value for player ${player.username}`);
    return;
  }

  if (player.trait === 'Shield' && Math.random() < 0.3) {
    console.log(`Shield blocked damage for player ${player.username}`);
    return; // 30% chance to completely block damage
  }
  
  if (player.shieldHealth > 0) {
    const remainingDamage = Math.max(0, damage - player.shieldHealth);
    player.shieldHealth = Math.max(0, player.shieldHealth - damage);
    if (remainingDamage > 0) {
      player.health = Math.max(0, player.health - remainingDamage);
    }
  } else {
    player.health = Math.max(0, player.health - damage);
  }

  console.log(`Player ${player.username} took ${damage} damage. Health: ${player.health}, Shield: ${player.shieldHealth}`);

  if (player.health <= 0) {
    console.log(`Player ${player.username} has died`);
    ws.send(JSON.stringify({ type: 'dead' }));
    players.delete(ws);
    broadcastGameState();
  } else {
    ws.send(JSON.stringify({ 
      type: 'hit', 
      id: player.id,
      health: player.health, 
      shieldHealth: player.shieldHealth 
    }));
  }
}

function respawnPlayer(player, ws) {
  player.x = Math.random() * MAP.width;
  player.y = Math.random() * MAP.height;
  player.health = SHIP_TIERS[0].health;
  player.tier = 0;
  player.exp = 0;
  player.damage = SHIP_TIERS[0].damage;
  player.trait = SHIP_TIERS[0].trait;
  player.shieldHealth = 0;

  console.log(`Player ${player.username} has respawned`);
  ws.send(JSON.stringify({ 
    type: 'respawn', 
    player: player 
  }));
}

function handleLevelUp(player) {
  player.tier++;
  player.health = SHIP_TIERS[player.tier].health;
  player.maxHealth = SHIP_TIERS[player.tier].health;
  player.damage = SHIP_TIERS[player.tier].damage;
  player.trait = SHIP_TIERS[player.tier].trait;
  player.shieldHealth = SHIP_TIERS[player.tier].trait === 'Shield' ? 50 : 0;
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

app.use(express.static(__dirname + '/public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
