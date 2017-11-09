const Player = require('./player.js');
const Bomb = require('./bomb.js');
const utils = require('../utils.js');

const GAME_PREPARING = 'preparing';
const GAME_STARTED = 'started';
const GAME_RESTARTING = 'restarting';

class Game {
  constructor(data) {
    this.room = data;
    this.status = GAME_PREPARING; // cycle: preparing -> started -> restarting -> (back to started)
    this.players = {};
    this.bombs = [];
    this.bombTimer = 2;
    this.currentTimer = this.bombTimer + 1;
    this.lastUpdate = new Date().getTime();
    this.dt = 0;

    // only nessesary data to set each update
    this.clientPlayers = {};
    this.clientBombs = [];

    this.restart = 1;
  }

  addPlayer(user) {
    this.players[user.hash] = new Player(user);
    this.clientPlayers[user.hash] = this.players[user.hash].getClientData();
  }

  deletePlayer(hash) {
    delete this.players[hash];
  }

  lockPlayerPos(hash) {
    const player = this.players[hash];

    // prevents break if player disconnects
    // due to child process being slightly off sync at times
    if (player) player.destPos = player.pos;
  }

  playersColliding(p1Hash, p2Hash, colliding) {
    const player1 = this.players[p1Hash];
    const player2 = this.players[p2Hash];

    // prevents break if player disconnects while colliding
    // due to child process being slightly off sync at times
    if (player1) player1.colliding = colliding;
    if (player2) player2.colliding = colliding;
  }

  createBombs() {
    this.currentTimer -= this.dt;

    if (this.currentTimer < 0 && this.bombs.length <= 30) {
      this.bombs.push(new Bomb(utils.getRandomInt(3)));

      this.bombTimer = Math.max(this.bombTimer * 0.98, 0.1);
      this.currentTimer = this.bombTimer;
    }
  }

  updateBombs() {
    for (let i = 0; i < this.bombs.length; i++) {
      this.bombs[i].update(this.dt);
    }

    // filter out non active bombs and create new ones
    this.bombs = this.bombs.filter(bomb => bomb.active);
    this.createBombs();
  }

  // add velocity to bombs
  pushBombs(pos) {
    // loop through bombs
    for (let i = 0; i < this.bombs.length; i++) {
      const bomb = this.bombs[i];

      // check only non-exploded bombs
      if (!bomb.exploding) {
        const distance = utils.circlesDistance(pos, bomb.pos);

        // range is 150
        if (distance < 150) {
          // pushStr range 0 ~ 5
          const pushStr = (150 - distance) / 30;
          const dx = bomb.pos.x - pos.x;
          const dy = bomb.pos.y - pos.y;
          const mag = Math.sqrt((dx * dx) + (dy * dy));

          // find max distance for x and y
          const maxVelocity = {
            x: (dx / mag) * pushStr,
            y: (dy / mag) * pushStr,
          };

          bomb.velocity = maxVelocity;
        }
      }
    }
  }

  // check if players are ready
  preparing() {
    const keys = Object.keys(this.players);
    let readyPlayers = 0;

    for (let i = 0; i < keys.length; i++) {
      const player = this.players[keys[i]];

      if (player.ready) {
        readyPlayers++;
      }

      this.clientPlayers[keys[i]] = player.getClientData();
    }

    this.status = keys.length === readyPlayers ? GAME_STARTED : this.status;
  }

  // creates bombs, checks collision, checks if players are dead
  started() {
    const keys = Object.keys(this.players);
    let deadPlayers = 0;

    // bomb update in check collision
    this.updateBombs(keys);

    // loop through players
    for (let i = 0; i < keys.length; i++) {
      const player = this.players[keys[i]];

      // increase score, check player collisions with other alive players
      if (!player.dead) {
        player.score++;

        // skill to push bombs away
        if (player.cooldown <= 0 && player.usedSkill) {
          player.cooldown = 6;
          player.usedSkill = false;

          this.pushBombs(player.pos);
        }
      } else {
        deadPlayers++;

        // skill to place bomb
        if (player.cooldown <= 0 && player.usedSkill) {
          player.cooldown = 4;
          this.bombs.push(new Bomb(1, player.pos));
          player.usedSkill = false;
        }
      }

      // reduce cooldown
      if (player.cooldown > 0) {
        player.cooldown -= this.dt;
      }

      this.clientPlayers[keys[i]] = player.getClientData();
    }

    // filter bomb data to send only necessary info
    this.clientBombs = this.bombs.map(bomb => ({
      pos: bomb.pos,
      radius: bomb.radius,
      exploding: bomb.exploding,
      explosionRadius: bomb.explosionRadius,
    }));

    this.status = keys.length === deadPlayers ? GAME_RESTARTING : this.status;
  }

  // reset player position, bomb timers, and player cooldown
  restarting(hardReset = false) {
    if (this.restart === 1) {
      const keys = Object.keys(this.players);

      for (let i = 0; i < keys.length; i++) {
        const player = this.players[keys[i]];

        let x = 250;

        // set players equally apart
        if (keys.length > 1) {
          x = Math.round((i / (keys.length - 1)) * 400) + 50;
        }

        player.reset({ x, y: 250 }, hardReset);
        this.clientPlayers[keys[i]] = player.getClientData();
      }

      // reset values
      this.bombTimer = 2;
      this.currentTimer = this.bombTimer + 1;
      this.bombs = [];
      this.clientBombs = [];
      this.restart -= this.dt;
    } else if (this.restart < 1 && this.restart > 0) {
      this.restart -= this.dt;
    } else if (this.restart <= 0) {
      this.status = GAME_PREPARING;
      this.restart = 1;
    }
  }

  // update dt and game based on status
  update() {
    const now = new Date().getTime();
    // in seconds
    this.dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (this.status === GAME_PREPARING) {
      this.preparing();
    } else if (this.status === GAME_STARTED) {
      this.started();
    } else if (this.status === GAME_RESTARTING) {
      this.restarting();
    } else {
      console.log('Game Status Broke: hard reseting game');
      this.restarting(true);
    }
  }
}


module.exports = Game;
