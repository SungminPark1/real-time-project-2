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
      g: 50 + utils.getRandomInt(201),
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

  // data the client needs every update
  // other data is sent when needed
  getClientData() {
    const { hash, lastUpdate, pos, destPos, prevPos, cooldown, score, colliding } = this;

    return {
      hash,
      lastUpdate,
      pos,
      destPos,
      prevPos,
      cooldown,
      score,
      colliding,
    };
  }

  update(user) {
    this.lastUpdate = new Date().getTime();

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
    this.prevPos = pos;
    this.destPos = pos;
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
