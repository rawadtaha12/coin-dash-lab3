/* global Phaser, COIN_DASH */
const HIGH_SCORE_KEY = 'coinDash.highScore';

// Storage may be unavailable (private mode, blocked site data) or hold junk; fall back to 0.
function loadHighScore() {
  try {
    const value = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch (e) {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch (e) {
    // Ignore: the best score just won't persist.
  }
}

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.highScore = loadHighScore();
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    // Shield power-up: a spinning star that grants a few seconds of drone immunity.
    this.shieldUntil = 0;
    this.aura = this.add.circle(this.player.x, this.player.y, 22)
      .setStrokeStyle(3, c.colors.shield).setFillStyle(c.colors.shield, 0.18).setVisible(false);
    this.shieldPickup = this.add.star(0, 0, 6, 7, 15, c.colors.shield)
      .setStrokeStyle(2, 0xffffff);
    this.physics.add.existing(this.shieldPickup);
    this.shieldPickup.body.setCircle(15);
    this.tweens.add({ targets: this.shieldPickup, angle: 360, duration: 2400, repeat: -1 });
    this.hideShieldPickup();
    // Right-aligned so it stays clear of the Coins / Best / Time HUD on the left.
    this.shieldHud = this.add.text(c.width - 18, 12, '',
      { font: '18px monospace', color: '#5ab8ff' }).setOrigin(1, 0);
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.shieldPickup, () => {
      if (this.finished) return;
      this.shieldUntil = this.time.now + c.shieldSeconds * 1000;
      this.hideShieldPickup();
    });
    this.physics.add.overlap(this.player, this.drones, () => {
      if (this.time.now < this.shieldUntil) return;
      this.finish('A drone caught you!');
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,P');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.paused = false;
    // The scene clock survives restart, so un-freeze it in case R was pressed while paused.
    this.time.paused = false;
    this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 320, 110, 0x0a1120, 0.9),
      this.add.text(0, 0, 'PAUSED\nPress P to resume',
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5)
    ]).setDepth(10).setVisible(false);
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      // Remember the time left so the round clock stands still while paused.
      this.remaining = this.deadline - this.time.now;
      // Freeze the shield too: its time left, and the pickup respawn timer.
      this.shieldRemaining = this.shieldUntil - this.time.now;
      this.time.paused = true;
      this.physics.pause();
    } else {
      this.deadline = this.time.now + this.remaining;
      this.shieldUntil = this.time.now + this.shieldRemaining;
      this.time.paused = false;
      this.physics.resume();
    }
    this.pauseOverlay.setVisible(this.paused);
  }

  randomSpot() {
    const c = COIN_DASH;
    // Avoid spawning collectibles directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    return { x, y };
  }

  placeCoin() {
    const { x, y } = this.randomSpot();
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  // Hide the shield pickup, then bring it back somewhere new after a delay.
  hideShieldPickup() {
    this.shieldPickup.setVisible(false);
    this.shieldPickup.body.enable = false;
    this.time.delayedCall(COIN_DASH.shieldSpawnDelaySeconds * 1000, () => {
      if (this.finished) return;
      const { x, y } = this.randomSpot();
      this.shieldPickup.setPosition(x, y).setVisible(true);
      this.shieldPickup.body.enable = true;
      this.shieldPickup.body.reset(x, y);
    });
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const shieldLeft = this.shieldUntil - this.time.now;
    // The aura follows the player and blinks during the last second as an expiry warning.
    this.aura.setPosition(this.player.x, this.player.y)
      .setVisible(shieldLeft > 0 && (shieldLeft > 1000 || Math.floor(shieldLeft / 125) % 2 === 0));
    this.shieldHud.setText(shieldLeft > 0 ? `SHIELD ${Math.ceil(shieldLeft / 1000)}s` : '');
    if (this.updateHud() === 0) this.finish('Time is up!');
  }

  updateHud() {
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}        Best: ${this.highScore}        Time: ${seconds}s`);
    return seconds;
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const isNewBest = this.score > this.highScore;
    if (isNewBest) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
    this.updateHud();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 190, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n`
        + `${isNewBest ? 'New high score!' : `Best: ${this.highScore}`}\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
