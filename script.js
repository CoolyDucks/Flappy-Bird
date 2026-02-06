let PLATFORM = null;

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("atlas", "res/assets/atlas.png");
    this.load.text("atlasData", "res/raw/atlas.txt");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    this.add.text(144, 100, "Flappy Bird", {
      font: "24px Arial",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(144, 140, "Choose Platform", {
      font: "14px Arial",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.createButton(144, 200, "Mobile", () => this.startGame("mobile"));
    this.createButton(144, 260, "Computer", () => this.startGame("pc"));
    this.createButton(144, 320, "PlayStation", () => this.startGame("ps"));
  }

  createButton(x, y, label, callback) {
    const btn = this.add.text(x, y, label, {
      font: "18px Arial",
      color: "#00ffcc"
    }).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", callback);
  }

  startGame(platform) {
    PLATFORM = platform;
    this.scene.restart();
  }
}

const config = {
  type: Phaser.AUTO,
  width: 288,
  height: 512,
  scene: MainScene
};

new Phaser.Game(config);
