const xxh = require('xxhashjs');
const child = require('child_process');
const Game = require('./game/game.js');
const Message = require('./message.js');

let io;
const gameRooms = {};
const collision = child.fork('./src/game/collision.js');

/* Message types
  lockPos
  playerColliding
  playerHit
  deadCollide
*/

collision.on('message', (m) => {
  switch (m.type) {
    case 'lockPos': {
      const room = gameRooms[m.data.roomKey];

      // lock their pos
      room.lockPlayerPos(m.data.p1Hash);
      room.lockPlayerPos(m.data.p2Hash);

      break;
    }
    case 'playerHit': {
      const room = gameRooms[m.data.roomKey];

      // set player.dead to true
      room.players[m.data.p1Hash].dead = true;

      io.sockets.in(m.data.roomKey).emit('playerDead', {
        hash: m.data.p1Hash,
        dead: true,
      });
      break;
    }
    case 'playerColliding': {
      const room = gameRooms[m.data.roomKey];

      // set both player to colliding value
      room.playersColliding(m.data.p1Hash, m.data.p2Hash, m.data.colliding);

      break;
    }
    case 'deadCollide': {
      const room = gameRooms[m.data.roomKey];

      // dead players should have colliding as false
      room.players[m.data.p1Hash].colliding = false;

      break;
    }
    default: {
      console.log(`unclear type: ${m.type} from collision.js`);
      break;
    }
  }
});

collision.on('error', (error) => {
  console.dir(error);
});

collision.on('close', (code, signal) => {
  console.log(`Child closed with ${code} ${signal}`);
});

collision.on('exit', (code, signal) => {
  console.log(`Child exited with ${code} ${signal}`);
});

// update room data and sent data to client at set interval
const updateRoom = (room) => {
  gameRooms[room].update();

  // send message to update child process rooms

  const { status, lastUpdate, clientPlayers, clientBombs } = gameRooms[room];

  collision.send(new Message('updateRoom', {
    roomKey: room,
    status,
    lastUpdate,
    players: clientPlayers,
    bombs: clientBombs,
  }));

  // only emit bombs, stats and player pos and score?
  io.sockets.in(room).emit('update', {
    status,
    lastUpdate,
    players: clientPlayers,
    bombs: clientBombs,
  });
};

// on connect put player in lobby
const onJoin = (sock) => {
  const socket = sock;

  // create player's hash and put them in the lobby room
  socket.on('join', () => {
    const hash = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16);

    socket.join('lobby');
    socket.room = 'lobby';
    socket.hash = hash;

    // emit back room names and player count
    const keys = Object.keys(gameRooms);
    const rooms = {};

    // loop through rooms and extract status and player count
    for (let i = 0; i < keys.length; i++) {
      const { status, players } = gameRooms[keys[i]];

      rooms[keys[i]] = {
        status,
        count: Object.keys(players).length,
      };
    }

    socket.emit('hash', { hash });
    socket.emit('roomList', rooms);
  });
};

// move the player to the room name they choose
// if room doesn't exist - create room
// else - they join the existing room
const onChangeRoom = (sock) => {
  const socket = sock;

  socket.on('changeRoom', (data) => {
    if (!gameRooms[data.room]) {
      socket.leave('lobby');
      socket.join(data.room);
      socket.room = data.room;

      gameRooms[data.room] = new Game(data.room);
      gameRooms[data.room].addPlayer(data.user);

      collision.send(new Message('addRoom', {
        roomKey: socket.room,
        room: gameRooms[socket.room],
      }));

      gameRooms[data.room].interval = setInterval(() => {
        updateRoom(data.room, io);
      }, 1000 / 60);

      socket.emit('initData', {
        status: gameRooms[data.room].status,
        dt: gameRooms[data.room].dt,
        players: gameRooms[data.room].players,
        bombs: gameRooms[data.room].bombs,
      });
    } else {
      // check if username is already in use
      const keys = Object.keys(gameRooms[data.room].players);

      for (let i = 0; i < keys.length; i++) {
        if (data.user.name === keys[i]) {
          socket.emit('usernameError', { msg: 'Username already in use' });
          return;
        }
      }

      socket.leave('lobby');
      socket.join(data.room);
      socket.room = data.room;

      gameRooms[data.room].addPlayer(data.user);

      collision.send(new Message('addPlayer', {
        roomKey: socket.room,
        playerHash: socket.hash,
        player: gameRooms[data.room].players[socket.hash],
      }));

      socket.emit('initData', {
        status: gameRooms[data.room].status,
        dt: gameRooms[data.room].dt,
        players: gameRooms[data.room].players,
        bombs: gameRooms[data.room].bombs,
      });

      socket.broadcast.emit('addPlayer', {
        hash: socket.hash,
        player: gameRooms[data.room].players[socket.hash],
      });
    }
  });
};

// refresh room listing in lobby
const onRoomRefresh = (sock) => {
  const socket = sock;

  socket.on('refreshRoom', () => {
    // emit back room names and player count
    const keys = Object.keys(gameRooms);
    const rooms = {};

    for (let i = 0; i < keys.length; i++) {
      const { status, players } = gameRooms[keys[i]];

      rooms[keys[i]] = {
        status,
        count: Object.keys(players).length,
      };
    }

    socket.emit('roomList', rooms);
  });
};

// update player movement
const onUpdatePlayer = (sock) => {
  const socket = sock;

  socket.on('updatePlayer', (user) => {
    const room = gameRooms[socket.room];
    const player = room.players[socket.hash];

    player.update(user);

    // emit location of skill used if player used a skill to animate client side
    if (room.status === 'started' && player.cooldown <= 0 && player.usedSkill) {
      io.sockets.in(socket.room).emit('skillUsed', {
        type: player.dead ? 'bomb' : 'push',
        color: player.color,
        pos: player.pos,
      });
    }
  });
};

// TO DO EMIT BACK READY
// toggle player's ready
const onTogglePlayerReady = (sock) => {
  const socket = sock;

  socket.on('togglePlayerReady', (user) => {
    const room = gameRooms[socket.room];

    room.players[socket.hash].toggleReady(user);

    io.sockets.in(socket.room).emit('playerReady', {
      hash: socket.hash,
      ready: user.ready,
    });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    // find the disconnected players room and deleted the player
    if (socket.room !== 'lobby') {
      const keys = Object.keys(gameRooms); // get the keys of the game rooms

      for (let i = 0; i < keys.length; i++) {
        const game = gameRooms[keys[i]];

        // check if the game's room matches the socket's room
        if (game.room === socket.room) {
          collision.send(new Message('deletePlayer', {
            roomKey: socket.room,
            playerHash: socket.hash,
          }));

          game.deletePlayer(socket.hash);

          io.sockets.in(socket.room).emit('removePlayer', socket.hash);

          socket.leave(socket.room);
          // deletes room if no players exist in it
          if (Object.keys(game.players).length === 0) {
            clearInterval(game.interval);

            collision.send(new Message('deletePlayer', {
              roomKey: game.room,
            }));

            delete gameRooms[keys[i]];
          }
        }
      }
    }
  });
};

const setupSockets = (ioServer) => {
  io = ioServer;

  io.sockets.on('connection', (socket) => {
    onJoin(socket);
    onChangeRoom(socket);
    onRoomRefresh(socket);
    onUpdatePlayer(socket);
    onTogglePlayerReady(socket);
    onDisconnect(socket);
  });
};

module.exports = {
  setupSockets,
};
