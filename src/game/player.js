const utils = require('../utils.js');

class Player {
  constructor(user) {
    this.name = user.name;
    this.pos = {
      x: 200 + utils.getRandomInt(100, 1),
      y: 200 + utils.getRandomInt(100, 1),
    };
    this.radius = 20;
    this.score = 0;
    this.color = {
      r: utils.getRandomInt(151),
      g: utils.getRandomInt(256),
      b: utils.getRandomInt(256),
    };
    this.ready = false;
    this.dead = false;
    this.placeBomb = false;
    this.cooldown = 0;
  }

  update(user) {
    this.pos = user.pos;
    this.placeBomb = user.placeBomb;
  }

  toggleReady(user) {
    this.ready = user.ready;
  }

  reset(pos, hardReset) {
    this.pos = pos;
    this.ready = false;
    this.dead = false;
    this.placeBomb = false;
    this.cooldown = 0;

    if (hardReset) {
      this.score = 0;
    }
  }
}

module.exports = Player;
