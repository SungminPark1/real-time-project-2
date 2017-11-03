const utils = require('../utils.js');

class Player {
  constructor(user) {
    this.hash = user.hash;
    this.name = user.name;
    this.lastUpdate = new Date().getTime();
    this.pos = {
      x: 200 + utils.getRandomInt(100, 1),
      y: 200 + utils.getRandomInt(100, 1),
    };
    this.prevPos = { ...this.pos };
    this.destPos = { ...this.pos };
    this.color = {
      r: utils.getRandomInt(151),
      g: utils.getRandomInt(256),
      b: utils.getRandomInt(256),
    };
    this.radius = 20;
    this.score = 0;
    this.alpha = 0.05;
    this.colliding = false;

    // game state related
    this.ready = false;
    this.dead = false;

    // skill related
    this.usedSkill = false;
    this.cooldown = 0;
  }

  update(user) {
    if (!this.colliding) {
      this.pos = user.pos;
    }
    this.prevPos = user.prevPos;
    this.destPos = user.destPos;
    this.usedSkill = user.usedSkill;
  }

  toggleReady(user) {
    this.ready = user.ready;
  }

  reset(pos, hardReset) {
    this.pos = pos;
    this.ready = false;
    this.dead = false;
    this.usedSkill = false;
    this.cooldown = 0;

    if (hardReset) {
      this.score = 0;
    }
  }
}

module.exports = Player;
