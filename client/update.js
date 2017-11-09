const updateMovement = (status) => {
  const user = players[hash];
  updated = false;
  usedSkill = false;

  user.prevPos = user.pos;
  user.alpha = 0.05;

  // movement check
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_W]) {
    user.destPos.y += -50 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_A]) {
    user.destPos.x += -50 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_S]) {
    user.destPos.y += 50 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_D]) {
    user.destPos.x += 50 * dt;
    updated = true;
  }

  // skill check
  if (status === 'started' && user.cooldown <= 0) {
    if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
      usedSkill = true;
      updated = true;
    }
  }

  // prevent player from going out of bound
  user.destPos.x = clamp(user.destPos.x, user.radius, 500 - user.radius);
  user.destPos.y = clamp(user.destPos.y, user.radius, 500 - user.radius);

  // console.log(user.pos, user.prevPos, user.destPos);
  const checkX = (user.pos.x > user.destPos.x + 0.05) || (user.pos.x < user.destPos.x - 0.05);
  const checkY = (user.pos.y > user.destPos.y + 0.05) || (user.pos.y < user.destPos.y - 0.05);

  // if this client's user moves, send to server to update server
  if (status !== 'restarting' && (updated === true || checkX || checkY)) {
    socket.emit('updatePlayer', {
      time: new Date().getTime(),
      pos: user.pos,
      prevPos: user.prevPos,
      destPos: user.destPos,
      usedSkill,
    });
  }
};

const updatePlayer = (users, status) => {
  const keys = Object.keys(users);

  // loop through players to update
  for (let i = 0; i < keys.length; i++) {
    const player = players[keys[i]];
    const updatedPlayer = users[keys[i]];

    // if player exist and last update is less than server's - update the player
    // else - do nothing
    if (player) {
      // values that should be constantly updated
      player.cooldown = updatedPlayer.cooldown;
      player.colliding = updatedPlayer.colliding;
      player.score = updatedPlayer.score;

      // values that should be updated if the client emited updatedPlayer
      if (player.lastUpdate < updatedPlayer.lastUpdate) {
        // Move last update out of player and keep track of rooms last update?
        player.lastUpdate = updatedPlayer.lastUpdate;

        player.alpha = 0.05;

        // only update current users pos if their colliding
        if (player.hash === hash) {
          if (player.colliding) {
            // player.pos = updatedPlayer.pos;
            player.prevPos = updatedPlayer.prevPos;
            player.destPos = updatedPlayer.destPos;
          }
        } else {
          player.prevPos = updatedPlayer.prevPos;
          player.destPos = updatedPlayer.destPos;
        }
      }

      // values to reset during game status 'restarting'
      if (status === 'restarting') {
        player.pos = updatedPlayer.pos;
        player.prevPos = updatedPlayer.prevPos;
        player.destPos = updatedPlayer.destPos;
        player.dead = false;
        player.ready = false;
      }
    }
  }
};

// called when server sends update
const handleUpdate = (data) => {
  roomStatus = data.status;
  bombs = data.bombs;

  updatePlayer(data.players, data.status);
};