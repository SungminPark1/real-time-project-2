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
let username;
let roomname;
let overlay;
let changeRoom;

// side bar element
let roomInfo;
let roomList;
let refreshRooms;
let scoreboard;
let scoreList;

// setup socket
const setupSocket = () => {
  socket.emit('join', { user });

  socket.on('update', handleUpdate);

  // get other clients data from server
  socket.on('initData', (data) => {
    players = data.players;
    bombs = data.bombs;
    user = data.players[user.name];

    overlay.style.display = 'none';
    roomInfo.style.display = 'none';
    scoreboard.style.display = 'block';
    drawPlayers();
  });

  socket.on('roomList', (data) => {
    const keys = Object.keys(data);
    roomList.innerHTML = '';

    for (let i = 0; i < keys.length; i++) {
      const room = data[keys[i]];
      let content = `<div class="room__container"><h2>${keys[i]}</h2>`;
      content += `<p>Status: ${room.status}</p><p>Player(s): ${room.count}</p></div>`;

      roomList.innerHTML += content;
    }
  });

  socket.on('usernameError', (data) => {
    username.style.border = 'solid 1px red';
    console.log(data.msg);
  });
};

// set up overlay
const setupOverlay = () => {
  username = document.querySelector('#username');
  roomname = document.querySelector('#roomname');
  overlay = document.querySelector('.canvas__overlay');
  changeRoom = document.querySelector('.change__room');

  changeRoom.addEventListener('click', () => {
    if (roomname.value) {
      user.name = username.value ? username.value : user.name;

      socket.emit('changeRoom', {
        room: roomname.value,
        user,
      });
    } else {
      roomname.style.border = 'solid 1px red';
    }
  });
};

  // sidebar
const setupSidebar = () => {
  roomInfo = document.querySelector('.room__infos');
  roomList = document.querySelector('.room__list');
  refreshRooms = document.querySelector('.refresh__room');
  scoreboard = document.querySelector('.scoreboard');
  scoreList = document.querySelector('.score__list');


  refreshRooms.addEventListener('click', () => {
    socket.emit('refreshRoom');
  });
};
