'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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

var socket = void 0;
var canvas = void 0;
var ctx = void 0;

// game related vars
var players = {};
var bombs = [];

// player related vars
var updated = false;
var placeBomb = false;
var previousKeyDown = false;
var user = {
  name: 'guest' + Math.floor(Math.random() * 1000 + 1),
  pos: {
    x: 0,
    y: 0
  }
};

// keyboard stuff
var myKeys = {
  KEYBOARD: {
    KEY_W: 87,
    KEY_A: 65,
    KEY_S: 83,
    KEY_D: 68,
    KEY_SPACE: 32
  },
  keydown: []
};

var clamp = function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
};

var update = function update(dt, status) {
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
        y: user.pos.y
      },
      placeBomb: placeBomb
    });
  }
};

var checkReady = function checkReady() {
  // emit only when current keypress is down and previous is up;
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
    socket.emit('togglePlayerReady', {
      name: user.name,
      ready: !user.ready
    });
  }
};

// called when server sends update update user pos?
// handled called in setup.js
var handleUpdate = function handleUpdate(data) {
  players = data.players;
  bombs = data.bombs;
  user = _extends({}, players[user.name], {
    pos: _extends({}, user.pos)
  });
  var userColor = 'rgb(' + user.color.r + ', ' + user.color.g + ', ' + user.color.b + ')';
  scoreList.innerHTML = '<p class="bold" style="text-decoration-color:' + userColor + '"; >' + user.name + ': ' + user.score + '</p>';

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
    user.pos = _extends({}, players[user.name].pos);

    drawText('Restarting', 180);
  }

  // prevent toggling ready each frame and placing bomb at the beginning
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE]) {
    previousKeyDown = true;
  } else {
    previousKeyDown = false;
  }
};

var init = function init() {
  socket = io.connect();
  canvas = document.querySelector('#main');
  ctx = canvas.getContext('2d');

  canvas.setAttribute('width', 500);
  canvas.setAttribute('height', 500);

  setupSocket();
  setupOverlay();
  setupSidebar();

  // event listeners
  window.addEventListener('keydown', function (e) {
    // console.log(`keydown: ${e.keyCode}`);
    // prevent spaces in name and scroll down function
    if (e.keyCode === myKeys.KEYBOARD.KEY_SPACE) e.preventDefault();
    myKeys.keydown[e.keyCode] = true;
  });

  window.addEventListener('keyup', function (e) {
    // console.log(`keyup: ${e.keyCode}`);
    // prevent spaces in name and scroll down function
    if (e.keyCode === myKeys.KEYBOARD.KEY_SPACE) e.preventDefault();
    myKeys.keydown[e.keyCode] = false;
  });
};

window.onload = init;

window.onunload = function () {
  socket.emit('disconnect');
};
'use strict';

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
var drawPlayers = function drawPlayers() {
  var status = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'started';

  var keys = Object.keys(players);

  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];

    // ignores this clients object
    if (keys[i] !== user.name) {
      scoreList.innerHTML += '<p>' + keys[i] + ': ' + player.score + '</p>';
      ctx.fillStyle = 'rgba(' + player.color.r + ', ' + player.color.g + ', ' + player.color.b + ', ' + (player.dead ? 0.25 : 1) + ')';
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
  ctx.fillStyle = 'rgba(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ', ' + (user.dead ? 0.25 : 1) + ')';
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
var drawBombs = function drawBombs() {
  for (var i = 0; i < bombs.length; i++) {
    var bomb = bombs[i];
    var fill = 'rgba(' + (bomb.exploding ? 255 : 0) + ', 0, 0, ' + (bomb.exploding ? 0.75 : 0.25) + ')';

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
var drawText = function drawText(text, x) {
  var y = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 40;
  var size = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 30;

  ctx.fillStyle = 'black';
  ctx.font = size + 'px Arial';
  ctx.fillText(text, x, y);
};
'use strict';

/* eslint-disable no-unused-vars, no-global-assign */

// variables from client.js
/* global socket */
/* global user */
/* global players */
/* global bombs */

// functions from client.js
/* global handleUpdate */

// function from draw.js
/* global drawPlayers */

// overlay vars
var username = void 0;
var roomname = void 0;
var overlay = void 0;
var changeRoom = void 0;

// side bar element
var roomInfo = void 0;
var roomList = void 0;
var refreshRooms = void 0;
var scoreboard = void 0;
var scoreList = void 0;

// setup socket
var setupSocket = function setupSocket() {
  socket.emit('join', { user: user });

  socket.on('update', handleUpdate);

  // get other clients data from server
  socket.on('initData', function (data) {
    players = data.players;
    bombs = data.bombs;
    user = data.players[user.name];

    overlay.style.display = 'none';
    roomInfo.style.display = 'none';
    scoreboard.style.display = 'block';
    drawPlayers();
  });

  socket.on('roomList', function (data) {
    var keys = Object.keys(data);
    roomList.innerHTML = '';

    for (var i = 0; i < keys.length; i++) {
      var room = data[keys[i]];
      var content = '<div class="room__container"><h2>' + keys[i] + '</h2>';
      content += '<p>Status: ' + room.status + '</p><p>Player(s): ' + room.count + '</p></div>';

      roomList.innerHTML += content;
    }
  });

  socket.on('usernameError', function (data) {
    username.style.border = 'solid 1px red';
    console.log(data.msg);
  });
};

// set up overlay
var setupOverlay = function setupOverlay() {
  username = document.querySelector('#username');
  roomname = document.querySelector('#roomname');
  overlay = document.querySelector('.canvas__overlay');
  changeRoom = document.querySelector('.change__room');

  changeRoom.addEventListener('click', function () {
    if (roomname.value) {
      user.name = username.value ? username.value : user.name;

      socket.emit('changeRoom', {
        room: roomname.value,
        user: user
      });
    } else {
      roomname.style.border = 'solid 1px red';
    }
  });
};

// sidebar
var setupSidebar = function setupSidebar() {
  roomInfo = document.querySelector('.room__infos');
  roomList = document.querySelector('.room__list');
  refreshRooms = document.querySelector('.refresh__room');
  scoreboard = document.querySelector('.scoreboard');
  scoreList = document.querySelector('.score__list');

  refreshRooms.addEventListener('click', function () {
    socket.emit('refreshRoom');
  });
};
