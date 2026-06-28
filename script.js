// ─── Flappy Bird – Complete Phaser 3 implementation ───────────────────────
// Atlas UV format: name  w  h  u  v  uw  vh  (all UV in 0..1 range)

// ── Constants ───────────────────────────────────────────────────────────────
const W = 288, H = 512;
const GRAVITY       = 1400;
const FLAP_VEL      = -420;
const PIPE_SPEED    = 160;
const PIPE_GAP      = 130;
const PIPE_INTERVAL = 1600; // ms between pipe spawns
const GROUND_H      = 112;
const GROUND_Y      = H - GROUND_H;  // 400
const BIRD_X        = 60;
const BIRD_START_Y  = 200;

// ── Atlas parser ─────────────────────────────────────────────────────────────
function parseAtlas(raw) {
  const map = {};
  for (const line of raw.trim().split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) continue;
    const [name, w, h, u, v, uw, vh] = parts;
    map[name] = {
      w: +w, h: +h,
      u: +u, v: +v, uw: +uw, vh: +vh
    };
  }
  return map;
}

// Draw a named atlas frame onto a Phaser Graphics / RenderTexture via copyRect
// We create individual RenderTextures for each sprite we need.
function makeFrame(scene, atlas, atlasKey, name, scale=1) {
  const f = atlas[name];
  if (!f) { console.warn('Atlas frame missing:', name); return null; }
  const atlasImg = scene.textures.get(atlasKey);
  const src = atlasImg.source[0];
  const aw = src.width, ah = src.height;
  const px = Math.round(f.u * aw);
  const py = Math.round(f.v * ah);
  const pw = Math.round(f.uw * aw);
  const ph = Math.round(f.vh * ah);
  const tw = Math.round(f.w * scale);
  const th = Math.round(f.h * scale);
  const rt = scene.add.renderTexture(0, 0, tw, th);
  rt.draw(atlasKey, -px, -py);
  // Crop to the right region via a new texture
  const key = `${name}_${Math.random().toString(36).slice(2)}`;
  atlasImg.add(key, 0, px, py, pw, ph);
  return { key: atlasImg.key, frame: key, w: pw, h: ph };
}

// ── Texture builder – runs once in boot scene ─────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.image('atlas', 'res/assets/atlas.png');
    this.load.text('atlasData', 'res/raw/atlas.txt');
  }

  create() {
    const raw = this.cache.text.get('atlasData');
    const atlas = parseAtlas(raw);
    this.registry.set('atlas', atlas);

    const img = this.textures.get('atlas');
    const src = img.source[0];
    const AW = src.width, AH = src.height;

    // Register every frame we need from the atlas
    const frames = [
      'bg_day','bg_night',
      'bird0_0','bird0_1','bird0_2',
      'bird1_0','bird1_1','bird1_2',
      'bird2_0','bird2_1','bird2_2',
      'land',
      'pipe_up','pipe_down','pipe2_up','pipe2_down',
      'title','tutorial','text_ready','text_game_over',
      'score_panel',
      'button_ok','button_play','button_score',
      'number_score_00','number_score_01','number_score_02',
      'number_score_03','number_score_04','number_score_05',
      'number_score_06','number_score_07','number_score_08','number_score_09',
      'number_context_00','number_context_01','number_context_02',
      'number_context_03','number_context_04','number_context_05',
      'number_context_06','number_context_07','number_context_08',
      'number_context_09','number_context_10',
      'medals_0','medals_1','medals_2','medals_3',
      'button_menu',
    ];

    for (const name of frames) {
      const f = atlas[name];
      if (!f) continue;
      const px = Math.round(f.u * AW);
      const py = Math.round(f.v * AH);
      const pw = Math.round(f.uw * AW);
      const ph = Math.round(f.vh * AH);
      img.add(name, 0, px, py, pw, ph);
    }

    this.scene.start('Menu');
  }
}

// ── Menu / Platform select ────────────────────────────────────────────────
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const atlas = this.registry.get('atlas');

    // Background
    this.add.image(W/2, H/2, 'atlas', 'bg_day').setDisplaySize(W, H);

    // Ground
    this.add.image(W/2, GROUND_Y + GROUND_H/2, 'atlas', 'land')
      .setDisplaySize(W, GROUND_H);

    // Title
    this.add.image(W/2, 120, 'atlas', 'title');

    // Bird idle
    this.add.image(W/2, 220, 'atlas', 'bird0_0');

    // Prompt
    this.add.text(W/2, 310, 'Tap / Click / Press X\nto choose your platform', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
      align: 'center', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    // Platform buttons
    this.makePlatBtn(W/2, 370, '📱 Mobile / Touch', 'mobile');
    this.makePlatBtn(W/2, 410, '🖥  Computer', 'pc');
    this.makePlatBtn(W/2, 450, '🎮 PlayStation', 'ps');
  }

  makePlatBtn(x, y, label, plat) {
    const btn = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: 'Arial', color: '#00ffcc',
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 5 },
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#00ffcc'));
    btn.on('pointerdown', () => {
      this.registry.set('platform', plat);
      this.scene.start('Game');
    });
  }
}

// ── Main Game ─────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.platform = this.registry.get('platform') || 'pc';
    this.atlas    = this.registry.get('atlas');

    // State: 'ready' | 'playing' | 'dead' | 'score'
    this.state    = 'ready';
    this.score    = 0;
    this.best     = this.registry.get('best') || 0;
    this.nightMode = false;

    this.buildWorld();
    this.buildBird();
    this.buildUI();
    this.buildPipes();
    this.buildInput();
    this.buildPS();

    // Physics tick
    this.birdVY = 0;
    this.birdAngle = 0;
    this.pipeTimer = 0;
    this.newBest = false;

    // Pipe list: [{up, down, scored}]
    this.pipes = [];

    // Colliders (manual AABB – no physics engine used)
    this.dead = false;
  }

  // ── World ────────────────────────────────────────────────────────────────
  buildWorld() {
    // BG
    this.bg = this.add.image(W/2, H/2, 'atlas', 'bg_day').setDisplaySize(W, H);

    // Scrolling ground – two tiles side by side
    this.ground1 = this.add.image(W/2, GROUND_Y + GROUND_H/2, 'atlas', 'land')
      .setDisplaySize(W, GROUND_H);
    this.ground2 = this.add.image(W + W/2, GROUND_Y + GROUND_H/2, 'atlas', 'land')
      .setDisplaySize(W, GROUND_H);
  }

  // ── Bird ─────────────────────────────────────────────────────────────────
  buildBird() {
    // Pick bird skin based on platform selection for fun
    const plat = this.platform;
    this.birdSkin = plat === 'ps' ? 'bird2' : plat === 'mobile' ? 'bird1' : 'bird0';
    this.birdFrames = [
      `${this.birdSkin}_0`,
      `${this.birdSkin}_1`,
      `${this.birdSkin}_2`,
      `${this.birdSkin}_1`,
    ];
    this.birdFrameIdx = 0;
    this.birdFrameTimer = 0;
    this.birdFrameInterval = 100; // ms per frame

    this.bird = this.add.image(BIRD_X, BIRD_START_Y, 'atlas', this.birdFrames[0])
      .setDepth(10);
    this.birdX = BIRD_X;
    this.birdY = BIRD_START_Y;
    this.birdVY = 0;

    // Idle bob
    this.bobTimer = 0;
    this.bobDir = 1;
  }

  // ── Pipes ─────────────────────────────────────────────────────────────────
  buildPipes() {
    this.pipeGroup = [];
  }

  spawnPipe() {
    const minTop = 60;
    const maxTop = GROUND_Y - PIPE_GAP - 60;
    const topH = Phaser.Math.Between(minTop, maxTop);
    const botY = topH + PIPE_GAP;
    const botH = GROUND_Y - botY;

    const pipeKey = this.nightMode ? 'pipe2' : 'pipe';

    // Down pipe (top obstacle) – flip vertically
    const upPipe = this.add.image(W + 30, topH / 2, 'atlas', `${pipeKey}_down`)
      .setDisplaySize(52, topH)
      .setFlipY(false)
      .setDepth(5);

    // Up pipe (bottom obstacle)
    const downPipe = this.add.image(W + 30, botY + botH / 2, 'atlas', `${pipeKey}_up`)
      .setDisplaySize(52, botH)
      .setDepth(5);

    this.pipeGroup.push({ up: upPipe, down: downPipe, scored: false, x: W + 30 });
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  buildUI() {
    // Score digits shown during play
    this.scoreImgs = [];
    for (let i = 0; i < 4; i++) {
      const img = this.add.image(W/2 + (i - 1.5) * 18, 60, 'atlas', 'number_score_00')
        .setDepth(20).setVisible(false);
      this.scoreImgs.push(img);
    }

    // "Get Ready" / tutorial
    this.readyImg = this.add.image(W/2, 160, 'atlas', 'text_ready').setDepth(20);
    this.tutImg   = this.add.image(W/2, 280, 'atlas', 'tutorial').setDepth(20);

    // PS hint
    this.psHint = this.add.text(W/2, H - 20, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#ffffffcc',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(20);

    if (this.platform === 'ps') {
      this.psHint.setText('Press ✕ (Cross) to flap');
    }

    // Game over panel (hidden initially)
    this.gameOverGroup = this.add.group();
    this.gameOverVisible = false;
  }

  showScorePanel() {
    this.gameOverGroup.clear(true, true);

    const cx = W/2, cy = H/2;

    // Game over text
    this.gameOverGroup.add(
      this.add.image(cx, cy - 100, 'atlas', 'text_game_over').setDepth(30)
    );

    // Score panel
    this.gameOverGroup.add(
      this.add.image(cx, cy + 10, 'atlas', 'score_panel').setDepth(30)
    );

    // Medal
    const medal = this.score >= 40 ? 'medals_0'
                : this.score >= 30 ? 'medals_1'
                : this.score >= 20 ? 'medals_2'
                : this.score >= 10 ? 'medals_3' : null;
    if (medal) {
      this.gameOverGroup.add(
        this.add.image(cx - 72, cy + 10, 'atlas', medal).setDepth(31)
      );
    }

    // Score digits – current
    this.drawContextDigits(cx + 55, cy - 10, this.score, false);
    // Best
    if (this.score > this.best) {
      this.best = this.score;
      this.registry.set('best', this.best);
      this.newBest = true;
    }
    this.drawContextDigits(cx + 55, cy + 28, this.best, false);

    // NEW badge
    if (this.newBest) {
      this.gameOverGroup.add(
        this.add.text(cx + 20, cy - 10, 'NEW!', {
          fontSize: '10px', fontFamily: 'Arial', color: '#ff4444',
          stroke: '#000', strokeThickness: 2
        }).setDepth(32)
      );
    }

    // OK / Retry button
    const btn = this.add.image(cx - 45, cy + 90, 'atlas', 'button_ok')
      .setDepth(30).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.restart());
    this.gameOverGroup.add(btn);

    // Menu button
    const menuBtn = this.add.image(cx + 45, cy + 90, 'atlas', 'button_menu')
      .setDepth(30).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('Menu'));
    this.gameOverGroup.add(menuBtn);

    if (this.platform === 'ps') {
      this.gameOverGroup.add(
        this.add.text(cx, cy + 120, '✕ Retry   △ Menu', {
          fontSize: '12px', fontFamily: 'Arial', color: '#ffffff',
          stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(32)
      );
    }
  }

  drawContextDigits(cx, cy, value, large) {
    const str = String(value);
    const prefix = large ? 'number_score_0' : 'number_context_0';
    const dw = large ? 16 : 12;
    const totalW = str.length * dw;
    for (let i = 0; i < str.length; i++) {
      const d = str[i];
      const frameKey = `number_context_0${d}`;
      const img = this.add.image(cx - totalW/2 + i*dw + dw/2, cy, 'atlas', frameKey)
        .setDepth(32);
      this.gameOverGroup.add(img);
    }
  }

  updateScoreDisplay() {
    const str = String(this.score);
    for (let i = 0; i < this.scoreImgs.length; i++) {
      this.scoreImgs[i].setVisible(false);
    }
    const digits = str.split('').map(Number);
    const start = Math.floor((this.scoreImgs.length - digits.length) / 2);
    for (let i = 0; i < digits.length; i++) {
      const img = this.scoreImgs[start + i];
      if (img) {
        img.setTexture('atlas', `number_score_0${digits[i]}`).setVisible(true);
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  buildInput() {
    // Space / Up arrow / click / tap all flap
    this.input.keyboard.on('keydown-SPACE', () => this.onFlap());
    this.input.keyboard.on('keydown-UP',    () => this.onFlap());
    this.input.keyboard.on('keydown-W',     () => this.onFlap());
    this.input.on('pointerdown', () => this.onFlap());
  }

  buildPS() {
    // PlayStation gamepad support
    this.input.gamepad.once('connected', (pad) => {
      this.pad = pad;
    });
    // Also grab any already-connected pad
    if (this.input.gamepad.total > 0) {
      this.pad = this.input.gamepad.getPad(0);
    }
    this.xWasDown = false;
    this.triangleWasDown = false;
  }

  onFlap() {
    if (this.state === 'ready') {
      this.startGame();
    } else if (this.state === 'playing') {
      this.flap();
    } else if (this.state === 'score') {
      this.restart();
    }
  }

  // ── Game flow ─────────────────────────────────────────────────────────────
  startGame() {
    this.state = 'playing';
    this.readyImg.setVisible(false);
    this.tutImg.setVisible(false);
    this.psHint.setVisible(false);
    this.updateScoreDisplay();
    for (const img of this.scoreImgs) img.setVisible(true);
    this.birdVY = FLAP_VEL / 2;
  }

  flap() {
    if (this.state !== 'playing') return;
    this.birdVY = FLAP_VEL;
    // Small camera shake feedback
    this.cameras.main.shake(40, 0.003);
  }

  killBird() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.cameras.main.shake(120, 0.012);
    // Drop to ground
    this.time.delayedCall(600, () => {
      this.state = 'score';
      this.showScorePanel();
    });
  }

  restart() {
    this.newBest = false;
    this.scene.restart();
    // Keep platform
  }

  // ── Update loop ───────────────────────────────────────────────────────────
  update(time, delta) {
    const spd = window._gameSpeed || 1;
    const dt = (delta / 1000) * spd;

    this.updatePS();
    this.scrollGround(dt);

    if (this.state === 'ready') {
      this.doBob(dt);
      return;
    }
    if (this.state === 'dead' || this.state === 'score') {
      // Let bird fall during death animation
      if (this.state === 'dead') {
        this.birdVY += GRAVITY * dt;
        this.birdY  += this.birdVY * dt;
        this.bird.setY(this.birdY);
        if (this.birdY > GROUND_Y - 15) this.birdY = GROUND_Y - 15;
      }
      return;
    }

    // ── Playing ──
    this.birdVY += GRAVITY * dt;
    this.birdY  += this.birdVY * dt;
    this.bird.setY(this.birdY);

    // Rotation
    const targetAngle = Phaser.Math.Clamp(this.birdVY / 8, -25, 90);
    this.birdAngle = Phaser.Math.Linear(this.birdAngle, targetAngle, 0.2);
    this.bird.setAngle(this.birdAngle);

    // Animate wings
    this.birdFrameTimer += delta;
    if (this.birdFrameTimer >= this.birdFrameInterval) {
      this.birdFrameTimer = 0;
      this.birdFrameIdx = (this.birdFrameIdx + 1) % this.birdFrames.length;
      this.bird.setTexture('atlas', this.birdFrames[this.birdFrameIdx]);
    }

    // Ground collision
    if (this.birdY >= GROUND_Y - 15) {
      this.birdY = GROUND_Y - 15;
      this.killBird();
      return;
    }

    // Ceiling
    if (this.birdY < 10) {
      this.birdY = 10;
      this.birdVY = 0;
    }

    // Pipes
    this.pipeTimer += delta;
    if (this.pipeTimer >= PIPE_INTERVAL) {
      this.pipeTimer = 0;
      this.spawnPipe();
      // Alternate night/day every 5 scores
      if (this.score > 0 && this.score % 5 === 0) {
        this.nightMode = !this.nightMode;
        this.bg.setTexture('atlas', this.nightMode ? 'bg_night' : 'bg_day');
      }
    }

    const birdL = this.birdX - 16;
    const birdR = this.birdX + 16;
    const birdT = this.birdY - 14;
    const birdB = this.birdY + 14;

    for (let i = this.pipeGroup.length - 1; i >= 0; i--) {
      const p = this.pipeGroup[i];
      p.x -= PIPE_SPEED * dt;
      p.up.setX(p.x);
      p.down.setX(p.x);

      // Scoring
      if (!p.scored && p.x + 26 < this.birdX) {
        p.scored = true;
        this.score++;
        this.updateScoreDisplay();
      }

      // Collision
      const pL = p.x - 26;
      const pR = p.x + 26;
      const upB  = p.up.y + p.up.displayHeight / 2;
      const dnT  = p.down.y - p.down.displayHeight / 2;

      if (birdR > pL && birdL < pR) {
        if (birdT < upB || birdB > dnT) {
          this.killBird();
          return;
        }
      }

      // Remove offscreen pipes
      if (p.x < -60) {
        p.up.destroy();
        p.down.destroy();
        this.pipeGroup.splice(i, 1);
      }
    }
  }

  scrollGround(dt) {
    const speed = (this.state === 'playing') ? PIPE_SPEED * dt : 0;
    this.ground1.x -= speed;
    this.ground2.x -= speed;
    if (this.ground1.x <= -W/2) this.ground1.x = this.ground2.x + W;
    if (this.ground2.x <= -W/2) this.ground2.x = this.ground1.x + W;
    // Keep ground on top of everything
    this.ground1.setDepth(8);
    this.ground2.setDepth(8);
  }

  doBob(dt) {
    this.bobTimer += dt;
    this.birdY = BIRD_START_Y + Math.sin(this.bobTimer * 3) * 6;
    this.bird.setY(this.birdY);
  }

  updatePS() {
    if (!this.pad) {
      if (this.input.gamepad.total > 0) {
        this.pad = this.input.gamepad.getPad(0);
      }
      return;
    }

    // Cross (X) = button index 0 on PlayStation layout in browsers
    const xDown = this.pad.buttons[0]?.pressed || false;
    if (xDown && !this.xWasDown) this.onFlap();
    this.xWasDown = xDown;

    // Triangle = button index 3 — goes to menu on score screen
    const triDown = this.pad.buttons[3]?.pressed || false;
    if (triDown && !this.triangleWasDown && this.state === 'score') {
      this.scene.start('Menu');
    }
    this.triangleWasDown = triDown;
  }
}

// ── Boot & launch ─────────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#000000',
  input: {
    mouse:   true,
    touch:   true,
    gamepad: true,
    keyboard: true,
  },
  scene: [BootScene, MenuScene, GameScene],
};

window._phaserGame = new Phaser.Game(config);
window._gameSpeed = 1;
