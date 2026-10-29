// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Difficulty presets scale droneSpeed; key is the number key that selects each one.
  difficulties: {
    easy: { label: 'Easy', key: 'ONE', droneSpeedFactor: 0.7 },
    normal: { label: 'Normal', key: 'TWO', droneSpeedFactor: 1 },
    hard: { label: 'Hard', key: 'THREE', droneSpeedFactor: 1.4 }
  },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
