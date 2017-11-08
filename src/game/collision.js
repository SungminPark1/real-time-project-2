const utils = require('../utils.js');
const Message = require('../message.js');

const rooms = {};

/* Send Messages
  lockPos
  playerColliding
  playerHit
  deadCollide
*/

// checks player x player collision
const playerCollision = (room, playerKeys, index) => {
  const player1 = room.players[playerKeys[index]];

  for (let k = index; k < (playerKeys.length - 1); k++) {
    const player2 = room.players[playerKeys[k + 1]];

    // only check collision if the other player is alive
    if (!player2.dead) {
      const distance = utils.circlesDistance(player1.pos, player2.pos);
      const destDistance = utils.circlesDistance(player1.destPos, player2.destPos);

      // check if player is colliding and if destPos has smaller distance
      if (distance <= (player1.radius + player2.radius)) {
        let colliding = true;

        if (destDistance < distance) {
          // create fuction to handle in game.js
          // prevent player from colliding farther
          player1.destPos = { ...player1.pos };
          player2.destPos = { ...player2.pos };

          // SEND MESSAGE 'lockPos', roomKeys, {playerHash1, destPos1}, {playerHash2, destPos2}
          process.send(new Message('lockPos', {
            roomKey: room.room,
            p1Hash: player1.hash,
            p2Hash: player2.hash,
          }));
        } else if (destDistance > distance || destDistance > (player1.radius + player2.radius)) {
          // break out of colliding check by checking when destDistance increase
          colliding = false;
        }

        // SEND MESSAGE 'playerColliding', roomKey, bool, playerHash1, playerHash2
        process.send(new Message('playerColliding', {
          roomKey: room.room,
          colliding,
          p1Hash: player1.hash,
          p2Hash: player2.hash,
        }));
      }
    }
  }
};

// checks player x bomb and player x explosion collision
const bombCollision = (room, user) => {
  const player = user;

  // loop through bombs
  for (let k = 0; k < room.bombs.length; k++) {
    const bomb = room.bombs[k];

    // check collision with player if exploding
    if (bomb.exploding) {
      const distance = utils.circlesDistance(player.pos, bomb.pos);

      if (distance < (player.radius + bomb.explosionRadius)) {
        // create fuction to handle in game.js
        player.dead = true;
        player.collide = false;

        // SEND MESSAGE ('playerHit', roomKey, playerHash)
        process.send(new Message('playerHit', {
          roomKey: room.room,
          p1Hash: player.hash,
        }));

        // no longer need to check other collisions
        return;
      }
    }
  }
};

// checks each rooms collision
const checkCollisions = () => {
  const roomKeys = Object.keys(rooms);

  for (let i = 0; i < roomKeys.length; i++) {
    const room = rooms[roomKeys[i]];
    const playerKeys = Object.keys(room.players);

    // loop through each rooms player
    for (let j = 0; j < playerKeys.length; j++) {
      const player = room.players[playerKeys[j]];

      if (room.status !== 'restarting' && !player.dead) {
        playerCollision(room, playerKeys, j);
        if (room.status === 'started') {
          bombCollision(room, player);
        }
      } else if (player.dead && player.colliding) {
        player.colliding = false;

        // SEND MESSAGE 'deadCollide' roomKeys, bool, playerHash
        process.send(new Message('deadCollide', {
          roomKey: room.room,
          p1Hash: player.hash,
        }));
      }
    }
  }
};

setInterval(() => {
  checkCollisions();
}, 1000 / 60);

process.on('message', (m) => {
  switch (m.type) {
    case 'addRoom': {
      rooms[m.data.roomKey] = m.data.room;
      break;
    }
    case 'updateRoom': {
      const room = rooms[m.data.roomKey];

      if (room && room.lastUpdate < m.data.lastUpdate) {
        const keys = Object.keys(room.players);

        for (let i = 0; i < keys.length; i++) {
          const player = room.players[keys[i]];
          if (m.data.players[keys[i]]) {
            player.pos = m.data.players[keys[i]].pos;
            player.destPos = m.data.players[keys[i]].destPos;
            player.prevPos = m.data.players[keys[i]].prevPos;
          }
          if (m.data.status === 'restarting') {
            player.dead = false;
          }
        }

        room.bombs = m.data.bombs;
        room.status = m.data.status;
        room.lastUpdate = m.data.lastUpdate;
      }
      break;
    }
    case 'deleteRoom': {
      delete rooms[m.data.roomKey];
      break;
    }
    case 'addPlayer': {
      rooms[m.data.roomKey].players[m.data.playerHash] = m.data.player;
      break;
    }
    case 'deletePlayer': {
      delete rooms[m.data.roomKey].players[m.data.playerHash];
      break;
    }
    default: {
      console.log(`unclear type: ${m.type} from sockets.js`);
      break;
    }
  }
});
