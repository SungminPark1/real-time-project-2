/* eslint-disable no-unused-vars, no-global-assign */

// from index.js script
/* global io */

// variables from setup.js
/* global scoreList */

// functions from draw.js
/* global drawPlayers */
/* global drawBombs */
/* global drawText */

// functions from setup.js
/* global setupSocket */
/* global setupOverlay */
/* global setupSidebar */

let socket;
let canvas;
let ctx;

// game related vars
let players = {};
let bombs = [];

// player related vars
let updated = false;
let placeBomb = false;
let previousKeyDown = false;
let user = {
  name: `guest${Math.floor((Math.random() * 1000) + 1)}`,
  pos: {
    x: 0,
    y: 0,
  },
};

// keyboard stuff
const myKeys = {
  KEYBOARD: {
    KEY_W: 87,
    KEY_A: 65,
    KEY_S: 83,
    KEY_D: 68,
    KEY_SPACE: 32,
  },
  keydown: [],
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const update = (dt, status) => {
  updated = false;
  placeBomb = false;

  // movement check
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_W]) {
    user.pos.y += -100 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_A]) {
    user.pos.x += -100 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_S]) {
    user.pos.y += 100 * dt;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_D]) {
    user.pos.x += 100 * dt;
    updated = true;
  }

  // skill check
  if (status === 'started') {
    if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
      placeBomb = true;
      updated = true;
    }
  }

  // prevent player from going out of bound
  user.pos.x = clamp(user.pos.x, user.radius, 500 - user.radius);
  user.pos.y = clamp(user.pos.y, user.radius, 500 - user.radius);

  // if this client's user moves, send to server to update server
  if (updated === true) {
    socket.emit('updatePlayer', {
      name: user.name,
      pos: {
        x: user.pos.x,
        y: user.pos.y,
      },
      placeBomb,
    });
  }
};

const checkReady = () => {
  // emit only when current keypress is down and previous is up;
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
    socket.emit('togglePlayerReady', {
      name: user.name,
      ready: !user.ready,
    });
  }
};

// called when server sends update update user pos?
// handled called in setup.js
const handleUpdate = (data) => {
  players = data.players;
  bombs = data.bombs;
  user = {
    ...players[user.name],
    pos: {
      ...user.pos,
    },
  };
  const userColor = `rgb(${user.color.r}, ${user.color.g}, ${user.color.b})`;
  scoreList.innerHTML = `<p class="bold" style="text-decoration-color:${userColor}"; >${user.name}: ${user.score}</p>`;

  // handle update based on game status
  if (data.status === 'preparing') {
    // players can move and update ready status.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    update(data.dt, data.status);
    checkReady();
    drawPlayers(data.status);
    drawText('Waiting for Players to Ready', 60);
    drawText('(spacebar to ready)', 170, 70, 20);
  } else if (data.status === 'started') {
    // reset canvas and scoreboard
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // players can move, place bombs and see bombs
    update(data.dt, data.status);
    drawPlayers();
    drawBombs();
  } else if (data.status === 'restarting') {
    // freeze screen and loop back to start
    user.pos = {
      ...players[user.name].pos,
    };

    drawText('Restarting', 180);
  }

  // prevent toggling ready each frame and placing bomb at the beginning
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE]) {
    previousKeyDown = true;
  } else {
    previousKeyDown = false;
  }
};

const init = () => {
  socket = io.connect();
  canvas = document.querySelector('#main');
  ctx = canvas.getContext('2d');

  canvas.setAttribute('width', 500);
  canvas.setAttribute('height', 500);

  setupSocket();
  setupOverlay();
  setupSidebar();

  // event listeners
  window.addEventListener('keydown', (e) => {
    // console.log(`keydown: ${e.keyCode}`);
    // prevent spaces in name and scroll down function
    if (e.keyCode === myKeys.KEYBOARD.KEY_SPACE) e.preventDefault();
    myKeys.keydown[e.keyCode] = true;
  });

  window.addEventListener('keyup', (e) => {
    // console.log(`keyup: ${e.keyCode}`);
    // prevent spaces in name and scroll down function
    if (e.keyCode === myKeys.KEYBOARD.KEY_SPACE) e.preventDefault();
    myKeys.keydown[e.keyCode] = false;
  });
};

window.onload = init;

window.onunload = () => {
  socket.emit('disconnect');
};
