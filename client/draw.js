/* eslint-disable no-unused-vars, no-global-assign */

// variables from client.js
/* global ctx */
/* global user */
/* global players */
/* global bombs */

// functions from client.js
/* global handleUpdate */

// variables from setup.js
/* global scoreList */


// draw players
const drawPlayers = (status = 'started') => {
  const keys = Object.keys(players);

  for (let i = 0; i < keys.length; i++) {
    const player = players[keys[i]];

    // ignores this clients object
    if (keys[i] !== user.name) {
      scoreList.innerHTML += `<p>${keys[i]}: ${player.score}</p>`;
      ctx.fillStyle = `rgba(${player.color.r}, ${player.color.g}, ${player.color.b}, ${player.dead ? 0.25 : 1})`;
      ctx.strokeStyle = 'black';
      if (status === 'preparing' && player.ready) {
        ctx.save();
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
  ctx.fillStyle = `rgba(${user.color.r},${user.color.g},${user.color.b}, ${user.dead ? 0.25 : 1})`;
  if (status === 'preparing' && user.ready) {
    ctx.save();
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
