const rooms = {};

// checks player x player collision
const playerCollision = (roomName, player) => {

};

// checks player x bomb and player x explosion collision
const bombCollision = (roomName, player, bomb) => {

};

process.on('message', (object) => {
  switch (object.type) {
    case 'addRoom': {
      break;
    }
    case 'addPlayer': {
      break;
    }
    case 'deletePlater': {
      break;
    }
    default: {
      break;
    }
  }
});
