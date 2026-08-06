/**
 * CyberBreaker - A Cyberpunk Brick Breaker Game
 * Built with vanilla HTML5 Canvas, no external libraries.
 * Arne16 colorscheme used throughout.
 */

(function () {
    'use strict';

    // ============================================================
    // ARNE16 COLORSCHEME
    // ============================================================
    const C = {
        BLACK:       '#000000',
        GRAY:        '#9D9D9D',
        WHITE:       '#FFFFFF',
        DARK_RED:    '#BE2633',
        PINK:        '#E06F8B',
        BROWN:       '#493C2B',
        DARK_ORANGE: '#A46422',
        ORANGE:      '#EB8931',
        YELLOW:      '#F7E26B',
        DARK_CYAN:   '#2F484E',
        DARK_GREEN:  '#44891A',
        LIGHT_GREEN: '#A3CE27',
        DARK_BLUE:   '#1B2632',
        BLUE:        '#005784',
        LIGHT_BLUE:  '#31A2F2',
        LIGHT_CYAN:  '#B2DCE6',
    };

    // Brick color rows palette
    const BRICK_COLORS = [
        C.LIGHT_CYAN, C.LIGHT_BLUE, C.BLUE, C.DARK_BLUE,
        C.LIGHT_GREEN, C.DARK_GREEN, C.DARK_CYAN, C.YELLOW,
        C.ORANGE, C.DARK_ORANGE, C.BROWN, C.PINK, C.DARK_RED, C.GRAY,
    ];

    // ============================================================
    // CANVAS SETUP — HD rendering with device pixel ratio
    // ============================================================
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const GAME_W = 640;
    const GAME_H = 640;
    let displayScale = 1;    // CSS pixels / game units
    let dpr = 1;             // device pixel ratio

    // ============================================================
    // CACHED RESOURCES — pre-rendered canvases & gradient textures
    // ============================================================
    let gridCanvas = null;
    let vignetteCanvas = null;
    let brickTopHLCanvas = null;
    let brickLeftHLCanvas = null;
    let paddleBodyCanvas = null;
    let paddleHLCanvas = null;
    let paddleSideLightCanvas = null;
    let ballCanvasNormal = null;
    let ballCanvasPowerup = null;
    let ballHLCanvas = null;
    let ballDotCanvas = null;
    let ballGlowNormalCanvas = null;
    let ballGlowPowerupCanvas = null;

    function initCachedResources() {
        // --- Off-screen grid canvas ---
        gridCanvas = document.createElement('canvas');
        gridCanvas.width = GAME_W;
        gridCanvas.height = GAME_H;
        const gctx = gridCanvas.getContext('2d');
        gctx.strokeStyle = C.DARK_BLUE;
        gctx.lineWidth = 0.5;
        gctx.globalAlpha = 0.12;
        const gridSize = 40;
        for (let x = 0; x <= GAME_W; x += gridSize) {
            gctx.beginPath();
            gctx.moveTo(x, 0);
            gctx.lineTo(x, GAME_H);
            gctx.stroke();
        }
        for (let y = 0; y <= GAME_H; y += gridSize) {
            gctx.beginPath();
            gctx.moveTo(0, y);
            gctx.lineTo(GAME_W, y);
            gctx.stroke();
        }

        // --- Vignette canvas ---
        vignetteCanvas = document.createElement('canvas');
        vignetteCanvas.width = GAME_W;
        vignetteCanvas.height = GAME_H;
        const vctx = vignetteCanvas.getContext('2d');
        const vignette = vctx.createRadialGradient(
            GAME_W / 2, GAME_H / 2, GAME_W * 0.25,
            GAME_W / 2, GAME_H / 2, GAME_W * 0.72
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        vctx.fillStyle = vignette;
        vctx.fillRect(0, 0, GAME_W, GAME_H);

        // --- Brick template highlight canvases ---
        brickTopHLCanvas = document.createElement('canvas');
        brickTopHLCanvas.width = BRICK_W;
        brickTopHLCanvas.height = Math.ceil(BRICK_H * 0.5);
        const bctx1 = brickTopHLCanvas.getContext('2d');
        const topHL = bctx1.createLinearGradient(0, 0, 0, BRICK_H * 0.5);
        topHL.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        topHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
        bctx1.fillStyle = topHL;
        // Use rounded rect for the top half
        const r1 = Math.min(3, BRICK_W / 2, (BRICK_H * 0.5) / 2);
        bctx1.beginPath();
        bctx1.moveTo(r1, 0);
        bctx1.lineTo(BRICK_W - r1, 0);
        bctx1.quadraticCurveTo(BRICK_W, 0, BRICK_W, r1);
        bctx1.lineTo(BRICK_W, BRICK_H * 0.5);
        bctx1.lineTo(0, BRICK_H * 0.5);
        bctx1.lineTo(0, r1);
        bctx1.quadraticCurveTo(0, 0, r1, 0);
        bctx1.closePath();
        bctx1.fill();

        brickLeftHLCanvas = document.createElement('canvas');
        brickLeftHLCanvas.width = Math.ceil(BRICK_W * 0.3);
        brickLeftHLCanvas.height = BRICK_H;
        const bctx2 = brickLeftHLCanvas.getContext('2d');
        const leftHL = bctx2.createLinearGradient(0, 0, BRICK_W * 0.3, 0);
        leftHL.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        leftHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
        bctx2.fillStyle = leftHL;
        bctx2.fillRect(0, 0, BRICK_W * 0.3, BRICK_H);

        // --- Paddle body gradient canvas ---
        paddleBodyCanvas = document.createElement('canvas');
        paddleBodyCanvas.width = PADDLE_W;
        paddleBodyCanvas.height = PADDLE_H;
        const pctx1 = paddleBodyCanvas.getContext('2d');
        const pGrad = pctx1.createLinearGradient(0, 0, 0, PADDLE_H);
        pGrad.addColorStop(0, C.LIGHT_CYAN);
        pGrad.addColorStop(0.4, C.LIGHT_BLUE);
        pGrad.addColorStop(1, C.BLUE);
        const cornerR = PADDLE_H / 2;
        pctx1.fillStyle = pGrad;
        pctx1.beginPath();
        pctx1.moveTo(cornerR, 0);
        pctx1.lineTo(PADDLE_W - cornerR, 0);
        pctx1.quadraticCurveTo(PADDLE_W, 0, PADDLE_W, cornerR);
        pctx1.lineTo(PADDLE_W, PADDLE_H - cornerR);
        pctx1.quadraticCurveTo(PADDLE_W, PADDLE_H, PADDLE_W - cornerR, PADDLE_H);
        pctx1.lineTo(cornerR, PADDLE_H);
        pctx1.quadraticCurveTo(0, PADDLE_H, 0, PADDLE_H - cornerR);
        pctx1.lineTo(0, cornerR);
        pctx1.quadraticCurveTo(0, 0, cornerR, 0);
        pctx1.closePath();
        pctx1.fill();

        // --- Paddle highlight canvas ---
        paddleHLCanvas = document.createElement('canvas');
        paddleHLCanvas.width = PADDLE_W;
        paddleHLCanvas.height = PADDLE_H;
        const pctx2 = paddleHLCanvas.getContext('2d');
        const hlGrad = pctx2.createLinearGradient(0, 0, 0, PADDLE_H * 0.6);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        const cornerR2 = Math.min(cornerR - 1, (PADDLE_W - 8) / 2, (PADDLE_H * 0.5) / 2);
        pctx2.fillStyle = hlGrad;
        pctx2.beginPath();
        pctx2.moveTo(4 + cornerR2, 1);
        pctx2.lineTo(4 + PADDLE_W - 8 - cornerR2, 1);
        pctx2.quadraticCurveTo(4 + PADDLE_W - 8, 1, 4 + PADDLE_W - 8, 1 + cornerR2);
        pctx2.lineTo(4 + PADDLE_W - 8, 1 + PADDLE_H * 0.5);
        pctx2.lineTo(4, 1 + PADDLE_H * 0.5);
        pctx2.lineTo(4, 1 + cornerR2);
        pctx2.quadraticCurveTo(4, 1, 4 + cornerR2, 1);
        pctx2.closePath();
        pctx2.fill();

        // --- Paddle side light canvas (single, drawn at both sides) ---
        paddleSideLightCanvas = document.createElement('canvas');
        paddleSideLightCanvas.width = 4;
        paddleSideLightCanvas.height = PADDLE_H - 6;
        const pctx3 = paddleSideLightCanvas.getContext('2d');
        pctx3.fillStyle = C.WHITE;
        const slR = 2;
        pctx3.beginPath();
        pctx3.moveTo(slR, 0);
        pctx3.lineTo(4 - slR, 0);
        pctx3.quadraticCurveTo(4, 0, 4, slR);
        pctx3.lineTo(4, PADDLE_H - 6 - slR);
        pctx3.quadraticCurveTo(4, PADDLE_H - 6, 4 - slR, PADDLE_H - 6);
        pctx3.lineTo(slR, PADDLE_H - 6);
        pctx3.quadraticCurveTo(0, PADDLE_H - 6, 0, PADDLE_H - 6 - slR);
        pctx3.lineTo(0, slR);
        pctx3.quadraticCurveTo(0, 0, slR, 0);
        pctx3.closePath();
        pctx3.fill();

        // --- Ball normal canvas (gradient core) ---
        const ballSize = BALL_R * 2 + 2;
        ballCanvasNormal = document.createElement('canvas');
        ballCanvasNormal.width = ballSize;
        ballCanvasNormal.height = ballSize;
        const nctx = ballCanvasNormal.getContext('2d');
        const nGrad = nctx.createRadialGradient(
            BALL_R * 0.7, BALL_R * 0.7, BALL_R * 0.1,
            BALL_R + 1, BALL_R + 1, BALL_R
        );
        nGrad.addColorStop(0, C.WHITE);
        nGrad.addColorStop(1, C.LIGHT_BLUE);
        nctx.fillStyle = nGrad;
        nctx.beginPath();
        nctx.arc(BALL_R + 1, BALL_R + 1, BALL_R, 0, Math.PI * 2);
        nctx.fill();

        // --- Ball powerup canvas (gradient core) ---
        ballCanvasPowerup = document.createElement('canvas');
        ballCanvasPowerup.width = ballSize;
        ballCanvasPowerup.height = ballSize;
        const pwctx = ballCanvasPowerup.getContext('2d');
        const pwGrad = pwctx.createRadialGradient(
            BALL_R * 0.7, BALL_R * 0.7, BALL_R * 0.1,
            BALL_R + 1, BALL_R + 1, BALL_R
        );
        pwGrad.addColorStop(0, '#39FF14');
        pwGrad.addColorStop(1, '#1a8a0a');
        pwctx.fillStyle = pwGrad;
        pwctx.beginPath();
        pwctx.arc(BALL_R + 1, BALL_R + 1, BALL_R, 0, Math.PI * 2);
        pwctx.fill();

        // --- Ball specular highlight canvas ---
        ballHLCanvas = document.createElement('canvas');
        ballHLCanvas.width = ballSize;
        ballHLCanvas.height = ballSize;
        const hlctx = ballHLCanvas.getContext('2d');
        const hlG = hlctx.createRadialGradient(
            BALL_R * 0.7, BALL_R * 0.7, 0,
            BALL_R * 0.7, BALL_R * 0.7, BALL_R * 0.55
        );
        hlG.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        hlG.addColorStop(1, 'rgba(255, 255, 255, 0)');
        hlctx.fillStyle = hlG;
        hlctx.beginPath();
        hlctx.arc(BALL_R + 1, BALL_R + 1, BALL_R, 0, Math.PI * 2);
        hlctx.fill();

        // --- Ball bright dot canvas ---
        ballDotCanvas = document.createElement('canvas');
        ballDotCanvas.width = ballSize;
        ballDotCanvas.height = ballSize;
        const dotctx = ballDotCanvas.getContext('2d');
        dotctx.fillStyle = C.WHITE;
        dotctx.globalAlpha = 0.8;
        dotctx.beginPath();
        dotctx.arc(BALL_R + 1 - BALL_R * 0.25, BALL_R + 1 - BALL_R * 0.25, BALL_R * 0.2, 0, Math.PI * 2);
        dotctx.fill();

        // --- Ball glow sprite (normal) ---
        ballGlowNormalCanvas = document.createElement('canvas');
        ballGlowNormalCanvas.width = ballSize + 8;
        ballGlowNormalCanvas.height = ballSize + 8;
        const gnctx = ballGlowNormalCanvas.getContext('2d');
        const gnR = BALL_R + 4;
        const gnCx = BALL_R + 5, gnCy = BALL_R + 5;
        for (let i = 3; i >= 1; i--) {
            gnctx.globalAlpha = 0.12 / i;
            gnctx.fillStyle = C.LIGHT_CYAN;
            gnctx.beginPath();
            gnctx.arc(gnCx, gnCy, gnR + i * 2, 0, Math.PI * 2);
            gnctx.fill();
        }
        gnctx.globalAlpha = 0.15;
        gnctx.fillStyle = C.LIGHT_CYAN;
        gnctx.beginPath();
        gnctx.arc(gnCx, gnCy, gnR, 0, Math.PI * 2);
        gnctx.fill();

        // --- Ball glow sprite (powerup) ---
        ballGlowPowerupCanvas = document.createElement('canvas');
        ballGlowPowerupCanvas.width = ballSize + 8;
        ballGlowPowerupCanvas.height = ballSize + 8;
        const gpctx = ballGlowPowerupCanvas.getContext('2d');
        const gpR = BALL_R + 4;
        const gpCx = BALL_R + 5, gpCy = BALL_R + 5;
        for (let i = 4; i >= 1; i--) {
            gpctx.globalAlpha = 0.12 / i;
            gpctx.fillStyle = '#39FF14';
            gpctx.beginPath();
            gpctx.arc(gpCx, gpCy, gpR + i * 2, 0, Math.PI * 2);
            gpctx.fill();
        }
        gpctx.globalAlpha = 0.2;
        gpctx.fillStyle = '#39FF14';
        gpctx.beginPath();
        gpctx.arc(gpCx, gpCy, gpR, 0, Math.PI * 2);
        gpctx.fill();
    }

    function resizeCanvas() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const size = Math.min(vw, vh);

        // Cap the DPR at 2.0 to prevent performance lag on high-density screens
        dpr = Math.min(window.devicePixelRatio || 1, 2.0);

        displayScale = size / GAME_W;

        // Set canvas internal resolution to HD (display size × capped DPR)
        const hdWidth = Math.round(size * dpr);
        const hdHeight = Math.round(size * dpr);
        canvas.width = hdWidth;
        canvas.height = hdHeight;

        // Set CSS display size
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        // Scale context so all drawing uses GAME_W × GAME_H coordinates
        ctx.setTransform(dpr * displayScale, 0, 0, dpr * displayScale, 0, 0);

        // Re-init cached resources on resize (coordinates depend on transform)
        initCachedResources();

        // Re-init scanline pattern after context reset
        scanlinePattern = null;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ============================================================
    // GAME CONSTANTS
    // ============================================================
    const PADDLE_W = 100;
    const PADDLE_H = 14;
    const PADDLE_Y = GAME_H - 50;
    const PADDLE_SPEED = 7;

    const BALL_R = 7;
    const BALL_SPEED_INIT = 5;
    const BALL_MAX_SPEED = 10;

    const BRICK_ROWS_BASE = 5;
    const BRICK_COLS = 8;
    const BRICK_W = 66;
    const BRICK_H = 22;
    const BRICK_PAD = 6;
    const BRICK_TOP = 60;

    const TOTAL_LIVES = 5;
    const SCORE_PER_BRICK = 10;
    const SCORE_PER_WAVE = 100;

    const POWERUP_CHANCE = 0.05;  // 5% chance per block break
    const POWERUP_DURATION = 30;  // seconds

    // ============================================================
    // GAME STATE
    // ============================================================
    const STATE = { TITLE: 0, PLAYING: 1, GAME_OVER: 2 };
    let gameState = STATE.TITLE;

    let score = 0;
    let lives = TOTAL_LIVES;
    let wave = 1;
    let highScore = parseInt(localStorage.getItem('cyberBreakerHighScore')) || 0;

    // Paddle
    let paddle = { x: GAME_W / 2 - PADDLE_W / 2 };

    // Ball
    let ball = { x: 0, y: 0, vx: 0, vy: 0, launched: false, speed: BALL_SPEED_INIT };

    // Bricks
    let bricks = [];

    // Optimized alive counter — no more O(N) filter every frame
    let bricksAlive = 0;

    // Particles (for cyberpunk explosion effects)
    let particles = [];

    // Scanline offset for animation
    let scanlineOffset = 0;

    // Title screen glitch timer
    let glitchTimer = 0;

    // Global variable to cache the pattern so it isn't recreated every frame
    let scanlinePattern = null;

    // ============================================================
    // POWERUP STATE
    // ============================================================
    let powerupActive = false;
    let powerupTimer = 0;          // remaining time in seconds
    let powerupMessage = '';       // UI message to display
    let powerupMessageTimer = 0;   // how long to show the message (frames)

    // ============================================================
    // BRICK GENERATION
    // ============================================================
    function generateBricks(waveNum) {
        const b = [];
        const rows = Math.min(BRICK_ROWS_BASE + Math.floor((waveNum - 1) / 2), 10);
        const cols = BRICK_COLS;

        // Calculate starting X to center the bricks
        const totalW = cols * (BRICK_W + BRICK_PAD) - BRICK_PAD;
        const startX = (GAME_W - totalW) / 2;

        let aliveCount = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Some random gaps for variety in later waves
                if (waveNum > 2 && Math.random() < 0.08) continue;

                const hp = waveNum >= 5 && Math.random() < 0.2 ? 2 : 1;
                b.push({
                    x: startX + c * (BRICK_W + BRICK_PAD),
                    y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
                    w: BRICK_W,
                    h: BRICK_H,
                    hp: hp,
                    maxHp: hp,
                    color: BRICK_COLORS[(r + Math.floor(waveNum / 3)) % BRICK_COLORS.length],
                    alive: true,
                });
                aliveCount++;
            }
        }
        bricksAlive = aliveCount;
        return b;
    }

    // ============================================================
    // PARTICLE SYSTEM
    // ============================================================
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.03,
                size: 2 + Math.random() * 3,
                color: color,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.vx *= 0.98;
            p.vy *= 0.98;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // ============================================================
    // GAME INIT / RESET
    // ============================================================
    function resetBall() {
        ball.x = paddle.x + PADDLE_W / 2;
        ball.y = PADDLE_Y - BALL_R - 1;
        ball.vx = 0;
        ball.vy = 0;
        ball.launched = false;
        // 10% permanent speed increase per wave
        ball.baseSpeed = Math.min(
            BALL_SPEED_INIT * (1 + (wave - 1) * 0.1),
            BALL_MAX_SPEED
        );
        ball.speed = ball.baseSpeed;
    }

    function startGame() {
        score = 0;
        lives = TOTAL_LIVES;
        wave = 1;
        paddle.x = GAME_W / 2 - PADDLE_W / 2;
        bricks = generateBricks(wave);
        resetBall();
        particles = [];
        gameState = STATE.PLAYING;
    }

    function launchBall() {
        if (ball.launched) return;
        ball.launched = true;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.sin(angle) * ball.speed;
    }

    // ============================================================
    // POWERUP
    // ============================================================
    function activatePowerup() {
        powerupActive = true;
        powerupTimer = POWERUP_DURATION;
        powerupMessage = '⚡ POWERUP FOUND! ⚡';
        powerupMessageTimer = 180; // show for ~3 seconds at 60fps
        spawnParticles(ball.x, ball.y, '#39FF14', 25);
    }

    // ============================================================
    // INPUT HANDLING
    // ============================================================
    const keys = {};
    let mouseX = GAME_W / 2;
    let mouseActive = false;
    let touchActive = false;
    let touchX = GAME_W / 2;

    // Keyboard
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (gameState === STATE.TITLE) {
            startGame();
            return;
        }

        if (gameState === STATE.GAME_OVER) {
            startGame();
            return;
        }

        if (gameState === STATE.PLAYING) {
            if (e.code === 'Enter' || e.code === 'Space') {
                launchBall();
                e.preventDefault();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Mouse
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / displayScale;
        mouseActive = true;

        if (gameState === STATE.TITLE) {
            startGame();
        } else if (gameState === STATE.GAME_OVER) {
            startGame();
        } else if (gameState === STATE.PLAYING && !ball.launched) {
            launchBall();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / displayScale;
    });

    canvas.addEventListener('mouseup', () => {
        mouseActive = false;
    });

    // Touch
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchX = (touch.clientX - rect.left) / displayScale;
        touchActive = true;

        if (gameState === STATE.TITLE) {
            startGame();
        } else if (gameState === STATE.GAME_OVER) {
            startGame();
        } else if (gameState === STATE.PLAYING && !ball.launched) {
            launchBall();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchX = (touch.clientX - rect.left) / displayScale;
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchActive = false;
    }, { passive: false });

    // Prevent scrolling
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // ============================================================
    // UPDATE LOGIC
    // ============================================================
    function update() {
        if (gameState !== STATE.PLAYING) return;

        // --- Paddle movement ---
        if (touchActive) {
            paddle.x = touchX - PADDLE_W / 2;
        } else if (mouseActive) {
            paddle.x = mouseX - PADDLE_W / 2;
        } else {
            if (keys['ArrowLeft'] || keys['KeyA']) paddle.x -= PADDLE_SPEED;
            if (keys['ArrowRight'] || keys['KeyD']) paddle.x += PADDLE_SPEED;
        }
        // Clamp paddle
        paddle.x = Math.max(0, Math.min(GAME_W - PADDLE_W, paddle.x));

        // --- Ball follows paddle if not launched ---
        if (!ball.launched) {
            ball.x = paddle.x + PADDLE_W / 2;
            ball.y = PADDLE_Y - BALL_R - 1;
        } else {
            // Optimized speed boost using cached bricksAlive counter
            const totalBricks = bricks.length;
            const destroyedRatio = 1 - (bricksAlive / totalBricks);
            const speedBoost = 1 + destroyedRatio * 0.3; // up to 30% extra from brick destruction
            const newSpeed = Math.min(ball.baseSpeed * speedBoost, BALL_MAX_SPEED);

            // Normalize velocity and apply new speed
            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (currentSpeed > 0) {
                ball.vx = (ball.vx / currentSpeed) * newSpeed;
                ball.vy = (ball.vy / currentSpeed) * newSpeed;
            }

            // Ball movement
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall collisions
            if (ball.x - BALL_R <= 0) {
                ball.x = BALL_R;
                ball.vx = Math.abs(ball.vx);
            }
            if (ball.x + BALL_R >= GAME_W) {
                ball.x = GAME_W - BALL_R;
                ball.vx = -Math.abs(ball.vx);
            }
            if (ball.y - BALL_R <= 0) {
                ball.y = BALL_R;
                ball.vy = Math.abs(ball.vy);
            }

            // Bottom — lose a life (unless powerup is active)
            if (ball.y + BALL_R >= GAME_H) {
                if (powerupActive) {
                    // Powerup saves the life — show a message
                    powerupMessage = 'POWERUP SAVED YOUR LIFE!';
                    powerupMessageTimer = 120; // show for ~2 seconds at 60fps
                    spawnParticles(ball.x, ball.y, '#39FF14', 20);
                } else {
                    lives--;
                    spawnParticles(ball.x, ball.y, C.DARK_RED, 20);
                    if (lives <= 0) {
                        // Game over
                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem('cyberBreakerHighScore', highScore);
                        }
                        gameState = STATE.GAME_OVER;
                        return;
                    }
                }
                resetBall();
                return;
            }

            // Paddle collision
            if (
                ball.vy > 0 &&
                ball.y + BALL_R >= PADDLE_Y &&
                ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 5 &&
                ball.x >= paddle.x - BALL_R &&
                ball.x <= paddle.x + PADDLE_W + BALL_R
            ) {
                ball.y = PADDLE_Y - BALL_R - 1;
                // Calculate angle based on where ball hits paddle
                const hit = (ball.x - paddle.x) / PADDLE_W; // 0..1
                const launchAngle = -Math.PI / 2 + (hit - 0.5) * Math.PI * 0.75;
                ball.vx = Math.cos(launchAngle) * newSpeed;
                ball.vy = Math.sin(launchAngle) * newSpeed;
                spawnParticles(ball.x, ball.y, C.LIGHT_CYAN, 6);
            }

            // Brick collision
            for (let i = 0; i < bricks.length; i++) {
                const b = bricks[i];
                if (!b.alive) continue;

                if (
                    ball.x + BALL_R > b.x &&
                    ball.x - BALL_R < b.x + b.w &&
                    ball.y + BALL_R > b.y &&
                    ball.y - BALL_R < b.y + b.h
                ) {
                    // Determine collision side
                    const overlapLeft = (ball.x + BALL_R) - b.x;
                    const overlapRight = (b.x + b.w) - (ball.x - BALL_R);
                    const overlapTop = (ball.y + BALL_R) - b.y;
                    const overlapBottom = (b.y + b.h) - (ball.y - BALL_R);

                    const minOverlapX = Math.min(overlapLeft, overlapRight);
                    const minOverlapY = Math.min(overlapTop, overlapBottom);

                    if (minOverlapX < minOverlapY) {
                        ball.vx = -ball.vx;
                    } else {
                        ball.vy = -ball.vy;
                    }

                    b.hp--;
                    if (b.hp <= 0) {
                        b.alive = false;
                        bricksAlive--; // O(1) decrement instead of O(N) filter
                        const points = powerupActive ? SCORE_PER_BRICK * 2 : SCORE_PER_BRICK;
                        score += points;
                        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);

                        // 5% powerup chance on block break (only if not already active)
                        if (!powerupActive && Math.random() < POWERUP_CHANCE) {
                            activatePowerup();
                        }
                    } else {
                        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, C.WHITE, 4);
                    }
                    break; // One collision per frame
                }
            }
        }

        // --- Check wave complete ---
        if (bricksAlive <= 0) {
            score += SCORE_PER_WAVE;
            wave++;
            bricks = generateBricks(wave);
            resetBall();
            powerupActive = false;
            powerupTimer = 0;
            spawnParticles(GAME_W / 2, GAME_H / 2, C.YELLOW, 40);
        }

        // --- Powerup timer ---
        if (powerupActive) {
            powerupTimer -= 1 / 60; // decrement by ~1 frame at 60fps
            if (powerupTimer <= 0) {
                powerupActive = false;
                powerupTimer = 0;
            }
        }

        // --- Powerup message timer ---
        if (powerupMessageTimer > 0) {
            powerupMessageTimer--;
            if (powerupMessageTimer <= 0) {
                powerupMessage = '';
            }
        }

        // --- Update particles ---
        updateParticles();

        // --- Apply powerup speed boost ---
        if (powerupActive && ball.launched) {
            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (currentSpeed > 0) {
                const targetSpeed = ball.speed * 2;
                ball.vx = (ball.vx / currentSpeed) * targetSpeed;
                ball.vy = (ball.vy / currentSpeed) * targetSpeed;
            }
        }
    }

    // ============================================================
    // RENDER HELPERS — HD quality, no shadowBlur
    // ============================================================
    function createScanlinePattern() {
        // Create a tiny off-screen canvas to define the pattern (1px wide, 4px high)
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 1;
        patternCanvas.height = 4;
        const pctx = patternCanvas.getContext('2d');

        // Draw a single scanline at the top of the pattern
        pctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        pctx.fillRect(0, 0, 1, 1);

        // Return the pattern created from this canvas
        return ctx.createPattern(patternCanvas, 'repeat');
    }

    function drawScanlines() {
        // Initialize the pattern once
        if (!scanlinePattern) {
            scanlinePattern = createScanlinePattern();
        }

        // Update the offset for the animation effect [1]
        scanlineOffset = (scanlineOffset + 0.5) % 4;

        ctx.save();
        // Shift the context to simulate the moving scanlines
        ctx.translate(0, scanlineOffset);
        ctx.fillStyle = scanlinePattern;

        // Draw one large rectangle that covers the whole screen using the pattern
        // We extend the height by 4 to ensure no gaps appear during the offset shift
        ctx.fillRect(0, -scanlineOffset, GAME_W, GAME_H + 4);
        ctx.restore();
    }

    // Grid is now drawn once to off-screen canvas; this draws it as a single image
    function drawGrid() {
        if (gridCanvas) {
            ctx.drawImage(gridCanvas, 0, 0);
        }
    }

    // Draw rounded rectangle path
    function roundRectPath(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Performant glow text — multi-pass offset instead of shadowBlur
    function drawGlowText(text, x, y, color, glowColor, passes) {
        // Outer glow passes with decreasing alpha
        for (let i = passes; i >= 1; i--) {
            ctx.globalAlpha = 0.1 / i;
            ctx.fillStyle = glowColor;
            ctx.fillText(text, x - i, y - i);
            ctx.fillText(text, x + i, y - i);
            ctx.fillText(text, x - i, y + i);
            ctx.fillText(text, x + i, y + i);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    // Performant glow circle — multi-pass expanding radius instead of shadowBlur
    function drawGlowCircle(x, y, r, color, glowColor, passes) {
        for (let i = passes; i >= 1; i--) {
            ctx.globalAlpha = 0.12 / i;
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.arc(x, y, r + i * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Performant glow rect — multi-pass expanding rect instead of shadowBlur
    function drawGlowRect(x, y, w, h, color, glowColor, passes) {
        for (let i = passes; i >= 1; i--) {
            ctx.globalAlpha = 0.12 / i;
            ctx.fillStyle = glowColor;
            ctx.fillRect(x - i, y - i, w + i * 2, h + i * 2);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    // ============================================================
    // DRAW FUNCTIONS — HD quality, cached resources
    // ============================================================
    function drawHUD() {
        ctx.textBaseline = 'top';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';

        // Score — glow text instead of shadowBlur
        drawGlowText('SCORE: ' + score, 16, 14, C.YELLOW, C.YELLOW, 3);

        // Wave — center aligned
        ctx.textAlign = 'center';
        drawGlowText('WAVE ' + wave, GAME_W / 2, 14, C.LIGHT_BLUE, C.LIGHT_BLUE, 3);

        // Lives — right aligned
        ctx.textAlign = 'right';
        let livesStr = '';
        for (let i = 0; i < lives; i++) livesStr += '♦ ';
        drawGlowText(livesStr, GAME_W - 16, 14, C.DARK_RED, C.DARK_RED, 2);

        // High score
        ctx.textAlign = 'right';
        ctx.fillStyle = C.GRAY;
        ctx.font = '14px monospace';
        ctx.fillText('HI: ' + highScore, GAME_W - 16, 38);

        // Powerup active indicator
        if (powerupActive) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px monospace';
            const pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
            ctx.globalAlpha = pulse;
            const remaining = Math.ceil(powerupTimer);
            drawGlowText('[ POWERUP ACTIVE: ' + remaining + 's ]', GAME_W / 2, 36, '#39FF14', '#39FF14', 3);
            ctx.globalAlpha = 1.0;
        }

        // Powerup found message
        if (powerupMessage) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 18px monospace';
            const msgAlpha = Math.min(1, powerupMessageTimer / 30);
            ctx.globalAlpha = msgAlpha;
            drawGlowText(powerupMessage, GAME_W / 2, GAME_H / 2 - 40, '#39FF14', '#39FF14', 4);
            ctx.globalAlpha = 1.0;
            ctx.textBaseline = 'top';
        }
    }

    function drawPaddle() {
        const px = paddle.x;
        const py = PADDLE_Y;

        // Outer glow layer — multi-pass instead of shadowBlur
        const cornerR = PADDLE_H / 2;
        for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = 0.06 / i;
            ctx.fillStyle = C.LIGHT_CYAN;
            roundRectPath(px - 2 - i, py - 2 - i, PADDLE_W + 4 + i * 2, PADDLE_H + 4 + i * 2, cornerR + i);
            ctx.fill();
        }
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = C.LIGHT_CYAN;
        roundRectPath(px - 2, py - 2, PADDLE_W + 4, PADDLE_H + 4, cornerR);
        ctx.fill();

        // Main paddle body — cached gradient canvas
        ctx.globalAlpha = 1.0;
        ctx.drawImage(paddleBodyCanvas, px, py);

        // Inner top highlight — cached
        ctx.drawImage(paddleHLCanvas, px, py);

        // Neon edge outline — multi-pass instead of shadowBlur
        ctx.strokeStyle = C.LIGHT_CYAN;
        ctx.lineWidth = 1.5;
        for (let i = 2; i >= 1; i--) {
            ctx.globalAlpha = 0.1 / i;
            ctx.lineWidth = 1.5 + i;
            roundRectPath(px, py, PADDLE_W, PADDLE_H, cornerR);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 1.5;
        roundRectPath(px, py, PADDLE_W, PADDLE_H, cornerR);
        ctx.stroke();

        // Side accent lights — cached sprite
        ctx.globalAlpha = 0.8;
        ctx.drawImage(paddleSideLightCanvas, px + 2, py + 3);
        ctx.drawImage(paddleSideLightCanvas, px + PADDLE_W - 6, py + 3);
        ctx.globalAlpha = 1.0;
    }

    function drawBall() {
        const isPowerup = powerupActive;

        // Glow sprite — pre-rendered canvas instead of shadowBlur
        ctx.drawImage(
            isPowerup ? ballGlowPowerupCanvas : ballGlowNormalCanvas,
            ball.x - BALL_R - 4,
            ball.y - BALL_R - 4
        );

        // Core gradient — cached canvas
        ctx.drawImage(
            isPowerup ? ballCanvasPowerup : ballCanvasNormal,
            ball.x - BALL_R - 1,
            ball.y - BALL_R - 1
        );

        // Specular highlight — cached
        ctx.drawImage(ballHLCanvas, ball.x - BALL_R - 1, ball.y - BALL_R - 1);

        // Bright dot — cached
        ctx.drawImage(ballDotCanvas, ball.x - BALL_R - 1, ball.y - BALL_R - 1);
    }

    function drawBricks() {
        const brickCornerR = 3;
        const hlW = BRICK_W;
        const hlH = Math.ceil(BRICK_H * 0.5);
        const leftHLW = Math.ceil(BRICK_W * 0.3);

        for (const b of bricks) {
            if (!b.alive) continue;

            const hpRatio = b.hp / b.maxHp;

            // Soft outer glow — multi-pass instead of shadowBlur
            for (let i = 2; i >= 1; i--) {
                ctx.globalAlpha = 0.08 / i;
                ctx.fillStyle = b.color;
                roundRectPath(b.x - i, b.y - i, b.w + i * 2, b.h + i * 2, brickCornerR + i);
                ctx.fill();
            }

            // Brick body
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = b.color;
            roundRectPath(b.x, b.y, b.w, b.h, brickCornerR);
            ctx.fill();

            // If damaged, overlay darker layer
            if (hpRatio < 1) {
                ctx.fillStyle = C.BLACK;
                ctx.globalAlpha = (1 - hpRatio) * 0.6;
                roundRectPath(b.x, b.y, b.w, b.h, brickCornerR);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Top gradient highlight (bevel effect) — cached canvas
            ctx.drawImage(brickTopHLCanvas, b.x, b.y);

            // Left side subtle highlight — cached canvas
            ctx.drawImage(brickLeftHLCanvas, b.x, b.y);

            // Neon edge
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 0.5;
            roundRectPath(b.x, b.y, b.w, b.h, brickCornerR);
            ctx.stroke();

            // Damage crack effect
            if (hpRatio < 1 && hpRatio > 0) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 1.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(b.x + b.w * 0.35, b.y);
                ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.5);
                ctx.lineTo(b.x + b.w * 0.4, b.y + b.h * 0.7);
                ctx.lineTo(b.x + b.w * 0.65, b.y + b.h);
                ctx.stroke();
                ctx.lineCap = 'butt';
            }
        }
    }

    function drawParticles() {
        // Glow pass — wider, dimmer circles (replaces shadowBlur)
        for (const p of particles) {
            ctx.globalAlpha = p.life * 0.15;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        // Core pass — actual particle size
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // ============================================================
    // SCREEN RENDERERS — HD quality
    // ============================================================
    function drawTitleScreen() {
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid(); // cached single image

        // Ambient background glow
        const bgGlow = ctx.createRadialGradient(GAME_W / 2, 230, 30, GAME_W / 2, 230, 250);
        bgGlow.addColorStop(0, 'rgba(49, 162, 242, 0.08)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        // Cyberpunk title with glitch effect
        glitchTimer++;
        const glitch = Math.sin(glitchTimer * 0.05) > 0.95;
        const glitchOffsetX = glitch ? (Math.random() - 0.5) * 10 : 0;
        const glitchOffsetY = glitch ? (Math.random() - 0.5) * 4 : 0;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title "CYBER" with layered glow (no shadowBlur)
        ctx.font = 'bold 60px monospace';
        for (let i = 4; i >= 1; i--) {
            ctx.globalAlpha = 0.06 / i;
            ctx.fillStyle = C.LIGHT_BLUE;
            ctx.fillText('CYBER', GAME_W / 2 + glitchOffsetX + (Math.random() - 0.5) * i * 2, 200 + glitchOffsetY + (Math.random() - 0.5) * i);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = C.LIGHT_CYAN;
        ctx.fillText('CYBER', GAME_W / 2 + glitchOffsetX, 200 + glitchOffsetY);

        // Title "BREAKER" with layered glow
        ctx.font = 'bold 60px monospace';
        for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = 0.06 / i;
            ctx.fillStyle = C.LIGHT_BLUE;
            ctx.fillText('BREAKER', GAME_W / 2 - glitchOffsetX + (Math.random() - 0.5) * i * 2, 265 + glitchOffsetY + (Math.random() - 0.5) * i);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('BREAKER', GAME_W / 2 - glitchOffsetX, 265 + glitchOffsetY);

        // Decorative line
        const lineGrad = ctx.createLinearGradient(GAME_W * 0.2, 0, GAME_W * 0.8, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, C.LIGHT_CYAN);
        lineGrad.addColorStop(0.5, C.WHITE);
        lineGrad.addColorStop(0.7, C.LIGHT_CYAN);
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7 + Math.sin(glitchTimer * 0.08) * 0.3;
        ctx.beginPath();
        ctx.moveTo(GAME_W * 0.15, 295);
        ctx.lineTo(GAME_W * 0.85, 295);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Subtitle
        ctx.font = '18px monospace';
        ctx.fillStyle = C.GRAY;
        ctx.globalAlpha = 0.7 + Math.sin(glitchTimer * 0.06) * 0.3;
        ctx.fillText('[ BREAK THE GRID ]', GAME_W / 2, 340);
        ctx.globalAlpha = 1.0;

        // Instructions
        const pulse = 0.6 + Math.sin(glitchTimer * 0.08) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 22px monospace';
        drawGlowText('>> PRESS ANY KEY OR TAP <<', GAME_W / 2, 430, C.YELLOW, C.YELLOW, 2);
        ctx.globalAlpha = 1.0;

        ctx.font = '15px monospace';
        ctx.fillStyle = C.GRAY;
        ctx.fillText('← → or DRAG to move paddle', GAME_W / 2, 490);
        ctx.fillText('ENTER or TAP to launch ball', GAME_W / 2, 515);

        // High score
        if (highScore > 0) {
            ctx.font = '18px monospace';
            drawGlowText('HIGH SCORE: ' + highScore, GAME_W / 2, 575, C.ORANGE, C.ORANGE, 2);
        }

        ctx.textBaseline = 'top';
        drawScanlines();
    }

    function drawGameOverScreen() {
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid(); // cached single image

        // Ambient red glow
        const bgGlow = ctx.createRadialGradient(GAME_W / 2, 170, 20, GAME_W / 2, 170, 200);
        bgGlow.addColorStop(0, 'rgba(190, 38, 51, 0.1)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        // Game Over title
        const glitch = Math.sin(Date.now() * 0.003) > 0.92;
        const gx = glitch ? (Math.random() - 0.5) * 8 : 0;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // "GAME OVER" with layered glow (no shadowBlur)
        ctx.font = 'bold 56px monospace';
        for (let i = 4; i >= 1; i--) {
            ctx.globalAlpha = 0.06 / i;
            ctx.fillStyle = C.DARK_RED;
            ctx.fillText('GAME OVER', GAME_W / 2 + gx + (Math.random() - 0.5) * i * 2, 170 + (Math.random() - 0.5) * i);
        }
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = C.DARK_RED;
        ctx.fillText('GAME OVER', GAME_W / 2 + gx, 170);

        // Decorative line
        const lineGrad = ctx.createLinearGradient(GAME_W * 0.2, 0, GAME_W * 0.8, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.5, C.DARK_RED);
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(GAME_W * 0.2, 205);
        ctx.lineTo(GAME_W * 0.8, 205);
        ctx.stroke();

        // Final score — glow text
        ctx.font = 'bold 30px monospace';
        drawGlowText('SCORE: ' + score, GAME_W / 2, 270, C.YELLOW, C.YELLOW, 2);

        // Wave reached
        ctx.font = '22px monospace';
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('WAVE: ' + wave, GAME_W / 2, 315);

        // High score
        const isNew = score >= highScore && score > 0;
        ctx.font = isNew ? 'bold 26px monospace' : '22px monospace';
        drawGlowText(
            isNew ? '★ NEW HIGH SCORE: ' + score + ' ★' : 'HIGH SCORE: ' + highScore,
            GAME_W / 2, 375,
            isNew ? C.LIGHT_GREEN : C.ORANGE,
            isNew ? C.LIGHT_GREEN : C.ORANGE,
            isNew ? 3 : 2
        );

        // Play again
        const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 22px monospace';
        drawGlowText('>> PRESS ANY KEY OR TAP TO PLAY AGAIN <<', GAME_W / 2, 465, C.YELLOW, C.YELLOW, 2);
        ctx.globalAlpha = 1.0;

        ctx.textBaseline = 'top';
        drawScanlines();
    }

    // ============================================================
    // MAIN RENDER — HD quality, cached resources
    // ============================================================
    function render() {
        if (gameState === STATE.TITLE) {
            drawTitleScreen();
            return;
        }

        if (gameState === STATE.GAME_OVER) {
            drawGameOverScreen();
            updateParticles();
            drawParticles();
            return;
        }

        // --- Playing state ---
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid(); // cached single image draw

        // Draw game elements
        drawBricks();
        drawPaddle();
        drawBall();
        drawParticles();
        drawHUD();

        // Scanlines
        drawScanlines();

        // Subtle vignette — cached canvas draw instead of new gradient every frame
        if (vignetteCanvas) {
            ctx.drawImage(vignetteCanvas, 0, 0);
        }

        // Neon border — multi-pass glow instead of shadowBlur
        for (let i = 2; i >= 1; i--) {
            ctx.globalAlpha = 0.06 / i;
            ctx.strokeStyle = C.LIGHT_BLUE;
            ctx.lineWidth = 2 + i * 2;
            ctx.strokeRect(1, 1, GAME_W - 2, GAME_H - 2);
        }
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = C.DARK_BLUE;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, GAME_W - 2, GAME_H - 2);
        ctx.globalAlpha = 1.0;
    }

    // ============================================================
    // GAME LOOP
    // ============================================================
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // ============================================================
    // START
    // ============================================================
    requestAnimationFrame(gameLoop);

})();
