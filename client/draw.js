// draw players
const drawPlayers = (status = 'preparing') => {
  const keys = Object.keys(players);

  for (let i = 0; i < keys.length; i++) {
    const player = players[keys[i]];

    // lerp players
    if (player.alpha < 1 && !player.colliding) {
      player.alpha += 0.05;
    } else if (player.colliding) {
      // prevent player from vibrating while colliding
      player.alpha = 0;
    }

    player.pos = lerpPos(player.prevPos, player.destPos, player.alpha);

    // prevent player from going out of bound
    player.pos.x = clamp(player.pos.x, player.radius, 500 - player.radius);
    player.pos.y = clamp(player.pos.y, player.radius, 500 - player.radius);

    // ignores this clients object
    if (keys[i] !== hash) {
      scoreList.innerHTML += `<p>${player.name}: ${player.score}</p>`;
      ctx.fillStyle = `rgba(${player.color.r}, ${player.color.g}, ${player.color.b}, ${player.dead ? 0.25 : 1})`;
      ctx.strokeStyle = 'black';
      ctx.save();
      if (status === 'preparing' && player.ready) {
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      ctx.beginPath();
      ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }
  }

  // draw clients player
  const user = players[hash];
  ctx.fillStyle = `rgba(${user.color.r},${user.color.g},${user.color.b}, ${user.dead ? 0.25 : 1})`;
  ctx.save();
  if (status === 'preparing' && user.ready) {
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.arc(user.pos.x, user.pos.y, user.radius, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();

  // skill cooldown indicator
  const skillTimer = user.dead ? 4 : 6;
  const cooldown = 1 - (clamp(user.cooldown, 0, 6) / skillTimer);
  const endAngle = (Math.PI * 2 * cooldown) - (Math.PI / 2);
  ctx.strokeStyle = 'rgb(0, 0, 255)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(user.pos.x, user.pos.y, user.radius - 2, -Math.PI / 2, endAngle, false);
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
};

// draw bombs
const drawBombs = () => {
  for (let i = 0; i < bombs.length; i++) {
    const bomb = bombs[i];
    const fill = `rgba(${bomb.exploding ? 255 : 0}, 0, 0, ${bomb.exploding ? 0.75 : 0.25})`;

    ctx.strokeStyle = 'white';
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(bomb.pos.x, bomb.pos.y, bomb.radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(bomb.pos.x, bomb.pos.y, bomb.explosionRadius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
  }
};

// draw text
const drawText = (text, x, y = 40, size = 30) => {
  ctx.fillStyle = 'black';
  ctx.font = `${size}px Arial`;
  ctx.fillText(text, x, y);
};

// players can move and update ready status.
const preparing = (status) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateMovement(status);
  checkReady();
  drawPlayers(status);
  drawText('Waiting for Players to Ready', 60);
  drawText('(spacebar to ready)', 170, 70, 20);
};

// players can move, place bombs and see bombs
const started = (status) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateMovement(status);
  updateSkills();

  drawPlayers(status);
  drawBombs();
  drawSkills();
};

// handles the clients draw related functions
const handleDraw = () => {
  const now = new Date().getTime();
  // in seconds
  dt = (now - lastTime) / 1000;
  lastTime = now;

  const user = players[hash];
  const userColor = `rgb(${user.color.r}, ${user.color.g}, ${user.color.b})`;

  scoreList.innerHTML = `<p class="bold" style="text-decoration-color:${userColor}"; >${user.name}: ${user.score}</p>`;

  // handle update based on game status
  if (roomStatus === 'preparing') {
    preparing(roomStatus);
  } else if (roomStatus === 'started') {
    started(roomStatus);
  } else if (roomStatus === 'restarting') {
    // freeze screen and loop back to start
    skills = [];
    drawText('Restarting', 180);
  }

  // prevent toggling ready each frame and placing bomb at the beginning
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE]) {
    previousKeyDown = true;
  } else {
    previousKeyDown = false;
  }

  window.requestAnimationFrame(handleDraw);
};
