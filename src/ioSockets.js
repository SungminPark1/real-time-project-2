const Game = require('./game/game.js');

const gameRooms = {};

// update room data and sent data to client at set interval
const updateRoom = (room, io) => {
  gameRooms[room].update();

  const { status, dt, players, clientBombs } = gameRooms[room];
  io.sockets.in(room).emit('update', {
    status,
    dt,
    players,
    bombs: clientBombs,
  });
};

// on connect put player in lobby
// create room on room change if room doesn't exist
// else they join the existing room
const onJoined = (sock, io) => {
  const socket = sock;
  socket.on('join', (data) => {
    socket.join('lobby');
    socket.room = 'lobby';
    socket.name = data.user.name;

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

    socket.emit('roomList', rooms);
  });

  socket.on('changeRoom', (data) => {
    if (!gameRooms[data.room]) {
      socket.leave('lobby');
      socket.join(data.room);
      socket.room = data.room;
      socket.name = data.user.name;

      gameRooms[data.room] = new Game(data.room);
      gameRooms[data.room].addPlayer(data.user);

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

      socket.name = data.user.name;

      gameRooms[data.room].addPlayer(data.user);

      socket.emit('initData', {
        status: gameRooms[data.room].status,
        dt: gameRooms[data.room].dt,
        players: gameRooms[data.room].players,
        bombs: gameRooms[data.room].bombs,
      });
    }
  });
};

// update player movement
const onMsg = (sock) => {
  const socket = sock;

  // refresh room listing in lobby
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

  socket.on('updatePlayer', (user) => {
    const room = gameRooms[socket.room];

    room.players[user.name].update(user);
  });

  socket.on('togglePlayerReady', (user) => {
    const room = gameRooms[socket.room];

    room.players[user.name].toggleReady(user);
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
          game.deletePlayer(socket.name);

          // deletes room if no players exist in it
          if (Object.keys(game.players).length === 0) {
            clearInterval(game.interval);
            delete gameRooms[keys[i]];
          }
        }
      }
    }
  });
};

module.exports = {
  onJoined,
  onMsg,
  onDisconnect,
};
