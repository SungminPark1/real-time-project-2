'use strict';

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

// draw related
// help keep lower spec pc move at the same speed
var lastTime = new Date().getTime();
var dt = 0;

// game related vars
var roomStatus = 'preparing';
var players = {};
var bombs = [];
var skills = [];

// player related vars
var updated = false;
var usedSkill = false;
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
  var x = (1 - alpha) * pos0.x + alpha * pos1.x;
  var y = (1 - alpha) * pos0.y + alpha * pos1.y;

  // limit decimal to 2
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100
  };
};

var clamp = function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
};

var updateSkills = function updateSkills() {
  for (var i = 0; i < skills.length; i++) {
    var skill = skills[i];

    if (skill.type === 'push') {
      skill.outerRadius += 5;
      skill.innerRadius += 2.5;
      skill.opacity += -0.02;
      skill.life += -1;
    } else if (skill.type === 'bomb') {
      skill.outerRadius += -5;
      skill.innerRadius += -2.5;
      skill.opacity += 0.03;
      skill.life += -1;
    }
  }

  skills = skills.filter(function (skill) {
    return skill.life > 0;
  });
};

var drawSkills = function drawSkills() {
  for (var i = 0; i < skills.length; i++) {
    var skill = skills[i];
    var x = skill.pos.x;
    var y = skill.pos.y;

    var grad = ctx.createRadialGradient(x, y, 0, x, y, skill.outerRadius);
    grad.addColorStop(0, 'rgba(' + skill.color.r + ', ' + skill.color.g + ', ' + skill.color.b + ', ' + skill.opacity + ')');
    grad.addColorStop(1, 'rgba(' + skill.color.r + ', ' + skill.color.g + ', ' + skill.color.b + ', 0)');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, skill.outerRadius, 0, Math.PI * 2, false); // outer
    ctx.arc(x, y, skill.innerRadius, 0, Math.PI * 2, true); // inner
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
};

// show something when skill is used
var handleSkill = function handleSkill(data) {
  var skill = {
    type: data.type,
    pos: data.pos,
    color: {
      r: Math.round(data.color.r * 0.75),
      g: Math.round(data.color.g * 0.75),
      b: Math.round(data.color.b * 0.75)
    },
    outerRadius: 0,
    innerRadius: 0,
    opacity: 0,
    life: 30
  };

  if (skill.type === 'push') {
    skill.opacity = 0.6;
    skills.push(skill);
  } else if (skill.type === 'bomb') {
    skill.outerRadius = 150;
    skill.innerRadius = 75;
    skills.push(skill);
  }
};

var updateMovement = function updateMovement(status) {
  var user = players[hash];
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
  var checkX = user.pos.x > user.destPos.x + 0.05 || user.pos.x < user.destPos.x - 0.05;
  var checkY = user.pos.y > user.destPos.y + 0.05 || user.pos.y < user.destPos.y - 0.05;

  // if this client's user moves, send to server to update server
  if (status !== 'restarting' && (updated === true || checkX || checkY)) {
    socket.emit('updatePlayer', {
      time: new Date().getTime(),
      pos: user.pos,
      prevPos: user.prevPos,
      destPos: user.destPos,
      usedSkill: usedSkill
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

  // skill cooldown indicator
  var skillTimer = user.dead ? 4 : 6;
  var cooldown = 1 - clamp(user.cooldown, 0, 6) / skillTimer;
  var endAngle = Math.PI * 2 * cooldown - Math.PI / 2;
  ctx.strokeStyle = 'rgb(0, 0, 255)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(user.pos.x, user.pos.y, user.radius - 2, -Math.PI / 2, endAngle, false);
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
  updateSkills();

  drawPlayers(status);
  drawBombs();
  drawSkills();
};

// handles the clients draw related functions
var handleDraw = function handleDraw() {
  var now = new Date().getTime();
  // in seconds
  dt = (now - lastTime) / 1000;
  lastTime = now;

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

var updatePlayer = function updatePlayer(users, status) {
  var keys = Object.keys(users);

  // loop through players to update
  for (var i = 0; i < keys.length; i++) {
    var player = players[keys[i]];
    var updatedPlayer = users[keys[i]];

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
var handleUpdate = function handleUpdate(data) {
  roomStatus = data.status;
  bombs = data.bombs;

  updatePlayer(data.players, data.status);
};

var addPlayer = function addPlayer(data) {
  players[data.hash] = data.player;
};

var removePlayer = function removePlayer(userHash) {
  if (players[userHash]) {
    delete players[userHash];
  }
};

var setupSocket = function setupSocket() {
  socket.emit('join');

  socket.on('update', handleUpdate);

  socket.on('skillUsed', handleSkill);

  socket.on('addPlayer', addPlayer);

  socket.on('removePlayer', removePlayer);

  socket.on('playerReady', function (data) {
    var player = players[data.hash];

    player.ready = data.ready;
  });

  socket.on('playerDead', function (data) {
    var player = players[data.hash];

    player.dead = data.dead;
  });

  socket.on('hash', function (data) {
    hash = data.hash;
  });

  // get other clients data from server
  socket.on('initData', function (data) {
    players = data.players;
    bombs = data.bombs;

    overlay.style.display = 'none';
    roomInfo.style.display = 'none';
    scoreboard.style.display = 'block';

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

  // event listeners
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
