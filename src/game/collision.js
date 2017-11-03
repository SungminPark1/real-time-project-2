const utils = require('../utils.js');

const rooms = {};

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
        // let colliding = true;

        if (destDistance < distance) {
          // prevent player from colliding farther
          player1.destPos = { ...player1.pos };
          player2.destPos = { ...player2.pos };

          // SEND MESSAGE 'lockpos', roomKeys, {playerHash1, destPos1}, {playerHash2, destPos2}
        } else if (destDistance > distance || destDistance > (player1.radius + player2.radius)) {
          // colliding = false;
        }

        // SEND MESSAGE 'playerColliding', roomKey, bool, playerHash1, playerHash2
      }
    }
  }
};

// checks player x bomb and player x explosion collision
const bombCollision = (roomName, user) => {
  const player = user;

  // loop through bombs
  for (let k = 0; k < this.bombs.length; k++) {
    const bomb = this.bombs[k];

    // check collision with player if exploding
    if (bomb.exploding) {
      const distance = utils.circlesDistance(player.pos, bomb.pos);

      if (distance < (player.radius + bomb.explosionRadius)) {
        player.dead = true;

        // SEND MESSAGE ('playerHit', roomKey, playerHash)

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
      const player = room.players[playerKeys[i]];

      if (room.status !== 'restarting' && !player.dead) {
        playerCollision(room, playerKeys, j);
        if (room.status === 'started') {
          bombCollision(room, player);
        }
      } else if (player.dead && player.colliding) {
        player.colliding = false;

        // SEND MESSAGE 'setColliding' roomKeys, bool, playerHash
      }
    }
  }
};

setInterval(() => {
  checkCollisions();
}, 20);

process.on('message', (object) => {
  switch (object.type) {
    case 'addRoom': {
      break;
    }
    case 'updateRoom': {
      break;
    }
    case 'addPlayer': {
      break;
    }
    case 'updatePlayer': {
      break;
    }
    case 'deletePlater': {
      break;
    }
    default: {
      break;
    }
  }
});
