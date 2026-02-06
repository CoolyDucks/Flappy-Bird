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

    this.input.enabled = true;

    this.add.text(144, 100, "Flappy Bird", {
      font: "24px Arial",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(144, 140, "Choose Platform", {
      font: "14px Arial",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.createButton(144, 200, "Mobile", "mobile");
    this.createButton(144, 260, "Computer", "pc");
    this.createButton(144, 320, "PlayStation", "ps");
  }

  createButton(x, y, label, platform) {
    const btn = this.add.text(x, y, label, {
      font: "18px Arial",
      color: "#00ffcc",
      backgroundColor: "#111111",
      padding: { x: 10, y: 6 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", () => {
      PLATFORM = platform;
      btn.setColor("#ffffff");
      this.time.delayedCall(150, () => {
        this.scene.restart();
      });
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 288,
  height: 512,
  input: {
    mouse: true,
    touch: true,
    gamepad: true
  },
  scene: MainScene
};

new Phaser.Game(config);
