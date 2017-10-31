'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var socket = void 0;
var canvas = void 0;
var ctx = void 0;

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

// game related vars
var roomStatus = 'preparing';
var players = {};
var bombs = [];

// player related vars
var updated = false;
var placeBomb = false;
var previousKeyDown = false;
var hash = void 0;

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

// returns an object { x: var, y: var }
var lerpPos = function lerpPos(pos0, pos1, alpha) {
  return {
    x: (1 - alpha) * pos0.x + alpha * pos1.x,
    y: (1 - alpha) * pos0.y + alpha * pos1.y
  };
};

var clamp = function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
};

var updateMovement = function updateMovement(status) {
  var user = players[hash];
  updated = false;
  placeBomb = false;

  user.prevPos = user.pos;

  // movement check
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_W]) {
    user.destPos.y += -2;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_A]) {
    user.destPos.x += -2;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_S]) {
    user.destPos.y += 2;
    updated = true;
  }
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_D]) {
    user.destPos.x += 2;
    updated = true;
  }

  // skill check
  if (status === 'started') {
    if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
      placeBomb = true;
      updated = true;
    }
  }

  user.alpha = updated ? user.alpha : 0.05;

  // prevent player from going out of bound
  user.destPos.x = clamp(user.destPos.x, user.radius, 500 - user.radius);
  user.destPos.y = clamp(user.destPos.y, user.radius, 500 - user.radius);

  // console.log(user.pos, user.prevPos, user.destPos);
  // if this client's user moves, send to server to update server
  if (updated === true || user.pos.x !== user.destPos.x || user.pos.y !== user.destPos.y) {
    socket.emit('updatePlayer', {
      pos: user.pos,
      prevPos: user.prevPos,
      destPos: user.destPos,
      placeBomb: placeBomb
    });
  }
};

// draw players
var drawPlayers = function drawPlayers() {
  var status = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'preparing';

  var keys = Object.keys(players);

  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];

    // lerp players
    if (player.alpha < 1) {
      player.alpha += 0.05;
      // console.log(player.alpha);
    }

    player.pos = lerpPos(player.prevPos, player.destPos, player.alpha);

    // prevent player from going out of bound
    player.pos.x = clamp(player.pos.x, player.radius, 500 - player.radius);
    player.pos.y = clamp(player.pos.y, player.radius, 500 - player.radius);

    // ignores this clients object
    if (keys[i] !== hash) {
      scoreList.innerHTML += '<p>' + player.name + ': ' + player.score + '</p>';
      ctx.fillStyle = 'rgba(' + player.color.r + ', ' + player.color.g + ', ' + player.color.b + ', ' + (player.dead ? 0.25 : 1) + ')';
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
  var user = players[hash];
  ctx.fillStyle = 'rgba(' + user.color.r + ',' + user.color.g + ',' + user.color.b + ', ' + (user.dead ? 0.25 : 1) + ')';
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

var checkReady = function checkReady() {
  var user = players[hash];

  // emit only when current keypress is down and previous is up
  if (myKeys.keydown[myKeys.KEYBOARD.KEY_SPACE] && !previousKeyDown) {
    socket.emit('togglePlayerReady', {
      ready: !user.ready
    });
  }
};

// players can move and update ready status.
var preparing = function preparing(status) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateMovement(status);
  checkReady();
  drawPlayers(status);
  drawText('Waiting for Players to Ready', 60);
  drawText('(spacebar to ready)', 170, 70, 20);
};

// players can move, place bombs and see bombs
var started = function started(status) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateMovement(status);
  drawPlayers(status);
  drawBombs();
};

// handles the clients draw related functions
var handleDraw = function handleDraw() {
  var user = players[hash];
  var userColor = 'rgb(' + user.color.r + ', ' + user.color.g + ', ' + user.color.b + ')';

  scoreList.innerHTML = '<p class="bold" style="text-decoration-color:' + userColor + '"; >' + user.name + ': ' + user.score + '</p>';

  // handle update based on game status
  if (roomStatus === 'preparing') {
    preparing(roomStatus);
  } else if (roomStatus === 'started') {
    started(roomStatus);
  } else if (roomStatus === 'restarting') {
    // freeze screen and loop back to start
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

var updatePlayer = function updatePlayer(users) {
  var keys = Object.keys(users);

  // loop through players to update
  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];

    // if player doesn't exist in players object - add player
    // else if player exist and last update is less than server's - update the player
    // else - do nothing
    if (!player) {
      players[keys[i]] = _extends({}, users[keys[i]]);
    } else if (player && player.lastUpdate < users[keys[i]].lastUpdate) {
      var updatedPlayer = users[keys[i]];

      player.lastUpdate = updatedPlayer.lastUpdate;
      player.prevPos = updatedPlayer.prevPos;
      player.destPos = updatedPlayer.destPos;
      player.dead = updatedPlayer.dead;
      player.ready = updatedPlayer.ready;
      player.placeBomb = updatedPlayer.placeBomb;
      player.score = updatedPlayer.score;
      player.alpha = 0.05;
    }
  }
};

// TODO:
// reset player pos when status === 'restarting'
// called when server sends update
var handleUpdate = function handleUpdate(data) {
  roomStatus = data.status;

  updatePlayer(data.players);

  bombs = data.bombs;
};

var removePlayer = function removePlayer(userHash) {
  if (players[userHash]) {
    delete players[userHash];
  }
};

var setupSocket = function setupSocket() {
  socket.emit('join');

  socket.on('hash', function (data) {
    hash = data.hash;
  });

  socket.on('update', handleUpdate);

  // get other clients data from server
  socket.on('initData', function (data) {
    players = data.players;
    bombs = data.bombs;

    overlay.style.display = 'none';
    roomInfo.style.display = 'none';
    scoreboard.style.display = 'block';

    console.log(players);
    window.requestAnimationFrame(handleDraw);
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

  socket.on('removePlayer', removePlayer);
  socket.on('usernameError', function (data) {
    username.style.border = 'solid 1px red';
    console.log(data.msg);
  });
};

var init = function init() {
  socket = io.connect();
  canvas = document.querySelector('#main');
  ctx = canvas.getContext('2d');

  canvas.setAttribute('width', 500);
  canvas.setAttribute('height', 500);

  // overlay
  username = document.querySelector('#username');
  roomname = document.querySelector('#roomname');
  overlay = document.querySelector('.canvas__overlay');
  changeRoom = document.querySelector('.change__room');

  // sidebar
  roomInfo = document.querySelector('.room__infos');
  roomList = document.querySelector('.room__list');
  refreshRooms = document.querySelector('.refresh__room');
  scoreboard = document.querySelector('.scoreboard');
  scoreList = document.querySelector('.score__list');

  setupSocket();

  changeRoom.addEventListener('click', function () {
    if (roomname.value) {
      socket.emit('changeRoom', {
        room: roomname.value,
        user: {
          hash: hash,
          name: username.value ? username.value : 'guest' + Math.floor(Math.random() * 1000 + 1)
        }
      });
    } else {
      roomname.style.border = 'solid 1px red';
    }
  });

  refreshRooms.addEventListener('click', function () {
    socket.emit('refreshRoom');
  });

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
