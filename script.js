let PLATFORM = "pc"; 
let flapKey;

const config = {
  type: Phaser.AUTO,
  width: 288,
  height: 512,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let bird;
let pipes;
let started = false;

function preload() {
  this.load.image("atlas", "res/assets/atlas.png");
  this.load.text("atlasData", "res/raw/atlas.txt");
}

function create() {
  this.add.text(144, 120, "Choose Platform", {
    font: "18px Arial",
    color: "#ffffff"
  }).setOrigin(0.5);

  createButton(this, 144, 200, "Mobile", () => startGame(this, "mobile"));
  createButton(this, 144, 260, "Computer", () => startGame(this, "pc"));
  createButton(this, 144, 320, "PlayStation", () => startGame(this, "ps"));
}

function startGame(scene, platform) {
  PLATFORM = platform;
  scene.scene.restart({ start: true });
}

function update() {
  if (!started) return;

  if (bird.angle < 30) bird.angle += 1;

  if (bird.y > 520) {
    this.scene.restart();
  }
}

function create(data) {
  if (!data.start) return;

  started = true;

  this.add.image(144, 256, "atlas").setCrop(0, 0, 288, 512);

  bird = this.physics.add.sprite(60, 256, "atlas")
    .setCrop(0, 0, 48, 48);

  bird.setCollideWorldBounds(true);

  setupControls(this);

  pipes = this.physics.add.group();
  this.time.addEvent({
    delay: 1500,
    loop: true,
    callback: () => spawnPipes(this)
  });

  this.physics.add.collider(bird, pipes, () => {
    this.scene.restart();
  });
}

function flap() {
  if (!started) return;
  bird.setVelocityY(-300);
  bird.angle = -20;
}

function setupControls(scene) {
  if (PLATFORM === "mobile") {
    scene.input.on("pointerdown", flap);

    
  if (PLATFORM === "pc") {
    flapKey = scene.input.keyboard.addKey("SPACE");
    flapKey.on("down", flap);
  }

  if (PLATFORM === "ps") {
    scene.input.gamepad.once("connected", pad => {
      pad.on("down", (index) => {
        if (index === 0) flap(); 
      });
    });
  }
}

function spawnPipes(scene) {
  const gap = 120;
  const topY = Phaser.Math.Between(-200, -50);

  const pipeTop = scene.physics.add.sprite(288, topY, "atlas")
    .setCrop(0, 0, 52, 320)
    .setVelocityX(-120)
    .setImmovable(true);

  const pipeBottom = scene.physics.add.sprite(288, topY + 320 + gap, "atlas")
    .setCrop(0, 0, 52, 320)
    .setVelocityX(-120)
    .setImmovable(true);

  pipes.add(pipeTop);
  pipes.add(pipeBottom);
}

function createButton(scene, x, y, text, callback) {
  const btn = scene.add.text(x, y, text, {
    font: "16px Arial",
    color: "#00ffcc",
    backgroundColor: "#000000",
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setInteractive();

  btn.on("pointerdown", callback);
}
