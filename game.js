/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  // Restarting passes the chosen difficulty back in, so it survives R.
  init(data) { this.difficulty = data.difficulty || null; }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.started = false;
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
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart({ difficulty: this.difficulty }));
    for (const [name, preset] of Object.entries(c.difficulties)) {
      this.input.keyboard.on(`keydown-${preset.key}`, () => this.chooseDifficulty(name));
    }
    if (this.difficulty) this.startRound();
    else this.showDifficultyMenu();
  }

  showDifficultyMenu() {
    const c = COIN_DASH;
    this.hud.setText(`Coins: 0                       Time: ${c.roundSeconds}s`);
    const choices = Object.values(c.difficulties)
      .map((preset, i) => `${i + 1} ${preset.label}`).join('   ');
    this.menu = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 460, 150, 0x0a1120, 0.95),
      this.add.text(0, 0, `Choose difficulty\n${choices}`,
        { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
      ).setOrigin(0.5)
    ]);
  }

  // Number keys start the first round, or start a new round from the end screen.
  chooseDifficulty(name) {
    if (!this.started) {
      this.difficulty = name;
      this.startRound();
    } else if (this.finished) {
      this.scene.restart({ difficulty: name });
    }
  }

  startRound() {
    const c = COIN_DASH;
    if (this.menu) this.menu.destroy();
    this.started = true;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    const speed = c.droneSpeed * c.difficulties[this.difficulty].droneSpeedFactor;
    this.drones.getChildren().forEach((drone, i) => {
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    });
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished || !this.started) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    const label = COIN_DASH.difficulties[this.difficulty].label;
    this.hud.setText(`Coins: ${this.score}          ${label.padEnd(6)}          Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 520, 190, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again\n1 / 2 / 3 to change difficulty`,
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
