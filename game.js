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

    function resizeCanvas() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const size = Math.min(vw, vh);
        dpr = window.devicePixelRatio || 1;
        displayScale = size / GAME_W;

        // Set canvas internal resolution to HD (display size × DPR)
        const hdWidth = Math.round(size * dpr);
        const hdHeight = Math.round(size * dpr);
        canvas.width = hdWidth;
        canvas.height = hdHeight;

        // Set CSS display size
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        // Scale context so all drawing uses GAME_W × GAME_H coordinates
        ctx.setTransform(dpr * displayScale, 0, 0, dpr * displayScale, 0, 0);
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

    // Particles (for cyberpunk explosion effects)
    let particles = [];

    // Scanline offset for animation
    let scanlineOffset = 0;

    // Title screen glitch timer
    let glitchTimer = 0;

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
            }
        }
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
            // Dynamic speed: increases as blocks are destroyed, resets each wave
            const totalBricks = bricks.length;
            const aliveBricks = bricks.filter(function (b) { return b.alive; }).length;
            const destroyedRatio = 1 - (aliveBricks / totalBricks);
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
                const angle = hit * (-Math.PI) + Math.PI; // 0..PI mapped
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
        if (bricks.every(b => !b.alive)) {
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
    // RENDER HELPERS — HD quality
    // ============================================================
    function drawScanlines() {
        scanlineOffset = (scanlineOffset + 0.5) % 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        for (let y = scanlineOffset; y < GAME_H; y += 4) {
            ctx.fillRect(0, y, GAME_W, 1);
        }
    }

    function drawGrid() {
        ctx.strokeStyle = C.DARK_BLUE;
        ctx.lineWidth = 0.5;
        const gridSize = 40;
        for (let x = 0; x <= GAME_W; x += gridSize) {
            ctx.globalAlpha = 0.12;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_H);
            ctx.stroke();
        }
        for (let y = 0; y <= GAME_H; y += gridSize) {
            ctx.globalAlpha = 0.12;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
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

    function drawGlowRect(x, y, w, h, color, glowColor, glowBlur) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBlur;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.shadowBlur = 0;
    }

    function drawGlowCircle(x, y, r, color, glowColor, glowBlur) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBlur;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Smooth gradient fill for circles
    function drawGradientCircle(x, y, r, colorTop, colorBottom) {
        const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBottom);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // ============================================================
    // DRAW FUNCTIONS — HD quality
    // ============================================================
    function drawHUD() {
        ctx.textBaseline = 'top';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';

        // Score
        ctx.shadowColor = C.YELLOW;
        ctx.shadowBlur = 8;
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('SCORE: ' + score, 16, 14);
        ctx.shadowBlur = 0;

        // Wave
        ctx.textAlign = 'center';
        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 8;
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('WAVE ' + wave, GAME_W / 2, 14);
        ctx.shadowBlur = 0;

        // Lives
        ctx.textAlign = 'right';
        ctx.shadowColor = C.DARK_RED;
        ctx.shadowBlur = 6;
        ctx.fillStyle = C.DARK_RED;
        let livesStr = '';
        for (let i = 0; i < lives; i++) livesStr += '♦ ';
        ctx.fillText(livesStr, GAME_W - 16, 14);
        ctx.shadowBlur = 0;

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
            ctx.fillStyle = '#39FF14';
            ctx.shadowColor = '#39FF14';
            ctx.shadowBlur = 10;
            const remaining = Math.ceil(powerupTimer);
            ctx.fillText('[ POWERUP ACTIVE: ' + remaining + 's ]', GAME_W / 2, 36);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        // Powerup found message
        if (powerupMessage) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 18px monospace';
            const msgAlpha = Math.min(1, powerupMessageTimer / 30);
            ctx.globalAlpha = msgAlpha;
            ctx.fillStyle = '#39FF14';
            ctx.shadowColor = '#39FF14';
            ctx.shadowBlur = 14;
            ctx.fillText(powerupMessage, GAME_W / 2, GAME_H / 2 - 40);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.textBaseline = 'top';
        }
    }

    function drawPaddle() {
        const px = paddle.x;
        const py = PADDLE_Y;
        const cornerR = PADDLE_H / 2;

        // Outer glow layer
        ctx.shadowColor = C.LIGHT_CYAN;
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(178, 220, 230, 0.15)';
        roundRectPath(px - 2, py - 2, PADDLE_W + 4, PADDLE_H + 4, cornerR);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Main paddle body with gradient
        const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_H);
        grad.addColorStop(0, C.LIGHT_CYAN);
        grad.addColorStop(0.4, C.LIGHT_BLUE);
        grad.addColorStop(1, C.BLUE);
        ctx.fillStyle = grad;
        roundRectPath(px, py, PADDLE_W, PADDLE_H, cornerR);
        ctx.fill();

        // Inner top highlight
        const hlGrad = ctx.createLinearGradient(px, py, px, py + PADDLE_H * 0.6);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        roundRectPath(px + 4, py + 1, PADDLE_W - 8, PADDLE_H * 0.5, cornerR - 1);
        ctx.fill();

        // Neon edge outline
        ctx.strokeStyle = C.LIGHT_CYAN;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = C.LIGHT_CYAN;
        ctx.shadowBlur = 8;
        roundRectPath(px, py, PADDLE_W, PADDLE_H, cornerR);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Side accent lights
        ctx.fillStyle = C.WHITE;
        ctx.globalAlpha = 0.8;
        roundRectPath(px + 2, py + 3, 4, PADDLE_H - 6, 2);
        ctx.fill();
        roundRectPath(px + PADDLE_W - 6, py + 3, 4, PADDLE_H - 6, 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawBall() {
        const isPowerup = powerupActive;
        const primaryColor = isPowerup ? '#39FF14' : C.WHITE;
        const glowColor = isPowerup ? '#39FF14' : C.LIGHT_CYAN;
        const highlightColor = isPowerup ? '#B2FF59' : C.LIGHT_CYAN;

        // Multi-layer outer glow
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isPowerup ? 30 : 20;
        ctx.fillStyle = isPowerup ? 'rgba(57, 255, 20, 0.2)' : 'rgba(178, 220, 230, 0.15)';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R + 4, 0, Math.PI * 2);
        ctx.fill();

        // Core glow
        ctx.shadowBlur = isPowerup ? 20 : 12;
        drawGradientCircle(ball.x, ball.y, BALL_R, primaryColor, isPowerup ? '#1a8a0a' : C.LIGHT_BLUE);
        ctx.shadowBlur = 0;

        // Specular highlight (smooth reflection)
        const hlGrad = ctx.createRadialGradient(
            ball.x - BALL_R * 0.3, ball.y - BALL_R * 0.3, 0,
            ball.x - BALL_R * 0.3, ball.y - BALL_R * 0.3, BALL_R * 0.55
        );
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();

        // Small bright dot at the highlight center
        ctx.fillStyle = C.WHITE;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(ball.x - BALL_R * 0.25, ball.y - BALL_R * 0.25, BALL_R * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawBricks() {
        const brickCornerR = 3;
        for (const b of bricks) {
            if (!b.alive) continue;

            const hpRatio = b.hp / b.maxHp;

            // Soft outer glow
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = b.color;
            roundRectPath(b.x, b.y, b.w, b.h, brickCornerR);
            ctx.fill();
            ctx.shadowBlur = 0;

            // If damaged, overlay darker layer
            if (hpRatio < 1) {
                ctx.fillStyle = C.BLACK;
                ctx.globalAlpha = (1 - hpRatio) * 0.6;
                roundRectPath(b.x, b.y, b.w, b.h, brickCornerR);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // Top gradient highlight (bevel effect)
            const topHL = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h * 0.5);
            topHL.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
            topHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = topHL;
            roundRectPath(b.x, b.y, b.w, b.h * 0.5, brickCornerR);
            ctx.fill();

            // Left side subtle highlight
            const leftHL = ctx.createLinearGradient(b.x, b.y, b.x + b.w * 0.3, b.y);
            leftHL.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            leftHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = leftHL;
            ctx.fillRect(b.x, b.y, b.w * 0.3, b.h);

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
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
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
        drawGrid();

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

        // Title "CYBER" with layered glow
        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 40;
        ctx.font = 'bold 60px monospace';
        ctx.fillStyle = C.LIGHT_CYAN;
        ctx.fillText('CYBER', GAME_W / 2 + glitchOffsetX, 200 + glitchOffsetY);
        ctx.shadowBlur = 20;
        ctx.fillText('CYBER', GAME_W / 2 + glitchOffsetX, 200 + glitchOffsetY);

        // Title "BREAKER"
        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 35;
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('BREAKER', GAME_W / 2 - glitchOffsetX, 265 + glitchOffsetY);
        ctx.shadowBlur = 15;
        ctx.fillText('BREAKER', GAME_W / 2 - glitchOffsetX, 265 + glitchOffsetY);
        ctx.shadowBlur = 0;

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
        ctx.fillStyle = C.YELLOW;
        ctx.shadowColor = C.YELLOW;
        ctx.shadowBlur = 10;
        ctx.fillText('>> PRESS ANY KEY OR TAP <<', GAME_W / 2, 430);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        ctx.font = '15px monospace';
        ctx.fillStyle = C.GRAY;
        ctx.fillText('← → or DRAG to move paddle', GAME_W / 2, 490);
        ctx.fillText('ENTER or TAP to launch ball', GAME_W / 2, 515);

        // High score
        if (highScore > 0) {
            ctx.fillStyle = C.ORANGE;
            ctx.shadowColor = C.ORANGE;
            ctx.shadowBlur = 6;
            ctx.font = '18px monospace';
            ctx.fillText('HIGH SCORE: ' + highScore, GAME_W / 2, 575);
            ctx.shadowBlur = 0;
        }

        ctx.textBaseline = 'top';
        drawScanlines();
    }

    function drawGameOverScreen() {
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid();

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

        ctx.shadowColor = C.DARK_RED;
        ctx.shadowBlur = 40;
        ctx.font = 'bold 56px monospace';
        ctx.fillStyle = C.DARK_RED;
        ctx.fillText('GAME OVER', GAME_W / 2 + gx, 170);
        ctx.shadowBlur = 20;
        ctx.fillText('GAME OVER', GAME_W / 2 + gx, 170);
        ctx.shadowBlur = 0;

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

        // Final score
        ctx.shadowColor = C.YELLOW;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 30px monospace';
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('SCORE: ' + score, GAME_W / 2, 270);
        ctx.shadowBlur = 0;

        // Wave reached
        ctx.font = '22px monospace';
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('WAVE: ' + wave, GAME_W / 2, 315);

        // High score
        const isNew = score >= highScore && score > 0;
        ctx.font = isNew ? 'bold 26px monospace' : '22px monospace';
        ctx.fillStyle = isNew ? C.LIGHT_GREEN : C.ORANGE;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isNew ? 12 : 6;
        ctx.fillText(isNew ? '★ NEW HIGH SCORE: ' + score + ' ★' : 'HIGH SCORE: ' + highScore, GAME_W / 2, 375);
        ctx.shadowBlur = 0;

        // Play again
        const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = C.YELLOW;
        ctx.shadowColor = C.YELLOW;
        ctx.shadowBlur = 8;
        ctx.fillText('>> PRESS ANY KEY OR TAP TO PLAY AGAIN <<', GAME_W / 2, 465);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        ctx.textBaseline = 'top';
        drawScanlines();
    }

    // ============================================================
    // MAIN RENDER — HD quality
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
        drawGrid();

        // Draw game elements
        drawBricks();
        drawPaddle();
        drawBall();
        drawParticles();
        drawHUD();

        // Scanlines
        drawScanlines();

        // Subtle vignette
        const vignette = ctx.createRadialGradient(
            GAME_W / 2, GAME_H / 2, GAME_W * 0.25,
            GAME_W / 2, GAME_H / 2, GAME_W * 0.72
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, GAME_W, GAME_H);

        // Neon border
        ctx.strokeStyle = C.DARK_BLUE;
        ctx.lineWidth = 2;
        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(1, 1, GAME_W - 2, GAME_H - 2);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
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
