const utils = require('../utils.js');

class Bomb {
  constructor(strength, pos = { x: null, y: null }) {
    // increase chance for it to be spread out
    this.pos = {
      x: pos.x || utils.getRandomInt(19, 1) * 25,
      y: pos.y || utils.getRandomInt(19, 1) * 25,
    };
    this.prevPos = { ...this.pos };
    this.destPos = { ...this.pos };
    this.fuse = 2 + strength; // in sec
    this.radius = 0; // temp indication of when its about to explode
    this.exploding = false;
    this.explosionRadius = 40 + (strength * 20);
    this.explosionDur = 1; // 1 sec
    this.active = true;
  }

  // 
  update(dt) {
    if (!this.exploding) {
      // update fuse and radius
      // check if the bomb should start exploding

      this.fuse -= dt;
      this.radius = Math.min(this.explosionRadius - (this.fuse * 20), this.explosionRadius);

      this.exploding = this.fuse <= 0;
    } else {
      // update explosion duration and deactive bomb once done
      this.explosionDur -= dt;

      this.active = this.explosionDur > 0;
    }
  }
}

module.exports = Bomb;
