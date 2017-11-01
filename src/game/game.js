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
    this.clientBombs = [];
    this.bombTimer = 2;
    this.currentTimer = this.bombTimer + 1;
    this.time = new Date().getTime();
    this.lastUpdate = this.time;
    this.dt = 0;

    this.restart = 1;
  }

  addPlayer(user) {
    this.players[user.hash] = new Player(user);
  }

  deletePlayer(hash) {
    delete this.players[hash];
  }

  createBombs(dt) {
    this.currentTimer -= dt;

    if (this.currentTimer < 0 && this.bombs.length <= 30) {
      this.bombs.push(new Bomb(utils.getRandomInt(3)));

      this.bombTimer = Math.max(this.bombTimer * 0.98, 0.1);
      this.currentTimer = this.bombTimer;
    }
  }

  filterBombs() {
    this.bombs = this.bombs.filter(bomb => bomb.active);
  }

  // TO DO:
  // move collisions functions to collision.js since each room has same collision check
  bombCollision(playerKeys) {
    // loop through bombs
    for (let i = 0; i < this.bombs.length; i++) {
      const bomb = this.bombs[i];

      // check collision with player if exploding
      if (bomb.exploding) {
        for (let j = 0; j < playerKeys.length; j++) {
          const player = this.players[playerKeys[j]];

          if (!player.dead) {
            const distance = utils.circlesDistance(player.pos, bomb.pos);
            if (distance < (player.radius + bomb.explosionRadius)) {
              player.dead = true;
            }
          }
        }
      }

      bomb.update(this.dt);
    }
  }

  playerCollision(playerKeys, index) {
    const player1 = this.players[playerKeys[index]];
    for (let j = index; j < (playerKeys.length - 1); j++) {
      const player2 = this.players[playerKeys[j + 1]];

      // only check collision if the other player is alive
      if (!player2.dead) {
        const distance = utils.circlesDistance(player1.pos, player2.pos);
        const destDistance = utils.circlesDistance(player1.destPos, player2.destPos);

        // check if player is colliding and if destPos has smaller distance
        if (distance <= (player1.radius + player2.radius)) {
          player1.colliding = true;
          player2.colliding = true;

          if (destDistance < distance) {
            // prevent player from colliding farther
            player1.destPos = { ...player1.pos };
            player2.destPos = { ...player2.pos };
          } else if (destDistance > distance || destDistance > (player1.radius + player2.radius)) {
            player1.colliding = false;
            player2.colliding = false;
          }
        }
      }
    }
  }

  pushBombs(pos) {
    // loop through bombs
    for (let i = 0; i < this.bombs.length; i++) {
      const bomb = this.bombs[i];

      // check only non-exploded bombs
      if (!bomb.exploding) {
        const distance = utils.circlesDistance(pos, bomb.pos);
        if (distance < 150) {
          const pushStr = (150 - distance) / 150;

          // find max distance for x and y
          const maxX = (bomb.pos.x - pos.x) * (1 + pushStr);
          const maxY = (bomb.pos.y - pos.y) * (1 + pushStr);

          // velocity range -6 ~ 6
          bomb.velocity = {
            x: (maxX * pushStr) / 25,
            y: (maxY * pushStr) / 25,
          };
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

      this.playerCollision(keys, i);
      if (player.ready) {
        readyPlayers++;
      }
    }

    this.status = keys.length === readyPlayers ? GAME_STARTED : this.status;
  }

  // creates bombs, checks collision, checks if players are dead
  started() {
    const keys = Object.keys(this.players);
    let deadPlayers = 0;

    // bomb update in check collision
    this.bombCollision(keys);

    // loop through players
    for (let i = 0; i < keys.length; i++) {
      const player = this.players[keys[i]];

      // increase score, check player collisions with other alive players
      if (!player.dead) {
        this.playerCollision(keys, i);
        player.score++;

        // skill to push bombs away
        if (player.cooldown <= 0 && player.usedSkill) {
          player.cooldown = 6;
          this.pushBombs(player.pos);
          player.usedSkill = false;
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
    }

    // filter out non active bombs and create new ones
    this.filterBombs();
    this.createBombs(this.dt);

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

      for (let j = 0; j < keys.length; j++) {
        const player = this.players[keys[j]];

        let x = 250;

        // set players equally apart
        if (keys.length > 1) {
          x = Math.round((j / (keys.length - 1)) * 400) + 50;
        }

        player.reset({ x, y: 250 }, hardReset);
      }

      // reset values
      this.bombTimer = 2;
      this.currentTimer = this.bombTimer + 1;
      this.bombs = [];
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
    this.dt = (now - this.time) / 1000;
    this.time = now;

    if (this.status === GAME_PREPARING) {
      this.preparing();
    } else if (this.status === GAME_STARTED) {
      this.started();
    } else if (this.status === GAME_RESTARTING) {
      this.restarting();
    } else {
      console.log('AHHHHHH it broke...');
      this.restarting(true);
    }
  }
}


module.exports = Game;
