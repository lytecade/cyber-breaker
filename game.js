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
    // CANVAS SETUP — square canvas, scales to viewport
    // ============================================================
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const GAME_W = 640;
    const GAME_H = 640;
    let scale = 1;

    function resizeCanvas() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const size = Math.min(vw, vh);
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        scale = size / GAME_W;
    }

    // Set logical resolution
    canvas.width = GAME_W;
    canvas.height = GAME_H;
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
        ball.speed = Math.min(BALL_SPEED_INIT + (wave - 1) * 0.3, BALL_MAX_SPEED);
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
        mouseX = (e.clientX - rect.left) / scale;
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
        mouseX = (e.clientX - rect.left) / scale;
    });

    canvas.addEventListener('mouseup', () => {
        mouseActive = false;
    });

    // Touch
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        touchX = (touch.clientX - rect.left) / scale;
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
        touchX = (touch.clientX - rect.left) / scale;
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

            // Bottom — lose a life
            if (ball.y + BALL_R >= GAME_H) {
                lives--;
                spawnParticles(ball.x, ball.y, C.DARK_RED, 20);
                if (lives <= 0) {
                    // Game over
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('cyberBreakerHighScore', highScore);
                    }
                    gameState = STATE.GAME_OVER;
                } else {
                    resetBall();
                }
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
                ball.vx = Math.cos(launchAngle) * ball.speed;
                ball.vy = Math.sin(launchAngle) * ball.speed;
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
                        score += SCORE_PER_BRICK;
                        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);
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
            spawnParticles(GAME_W / 2, GAME_H / 2, C.YELLOW, 40);
        }

        // --- Update particles ---
        updateParticles();
    }

    // ============================================================
    // RENDER HELPERS
    // ============================================================
    function drawScanlines() {
        scanlineOffset = (scanlineOffset + 0.5) % 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = scanlineOffset; y < GAME_H; y += 4) {
            ctx.fillRect(0, y, GAME_W, 1);
        }
    }

    function drawGrid() {
        ctx.strokeStyle = C.DARK_BLUE;
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x <= GAME_W; x += gridSize) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_H);
            ctx.stroke();
        }
        for (let y = 0; y <= GAME_H; y += gridSize) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    function drawGlowRect(x, y, w, h, color, glowColor, glowBlur) {
        // Glow
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

    // ============================================================
    // DRAW FUNCTIONS
    // ============================================================
    function drawHUD() {
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';

        // Score
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('SCORE: ' + score, 16, 30);

        // Wave
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.textAlign = 'center';
        ctx.fillText('WAVE ' + wave, GAME_W / 2, 30);

        // Lives
        ctx.textAlign = 'right';
        ctx.fillStyle = C.DARK_RED;
        let livesStr = '';
        for (let i = 0; i < lives; i++) livesStr += '♦ ';
        ctx.fillText(livesStr, GAME_W - 16, 30);

        // High score
        ctx.textAlign = 'right';
        ctx.fillStyle = C.GRAY;
        ctx.font = '12px monospace';
        ctx.fillText('HI: ' + highScore, GAME_W - 16, 50);
    }

    function drawPaddle() {
        const px = paddle.x;
        const py = PADDLE_Y;

        // Glow
        drawGlowRect(px - 2, py - 2, PADDLE_W + 4, PADDLE_H + 4,
            'transparent', C.LIGHT_CYAN, 12);

        // Main paddle body
        const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_H);
        grad.addColorStop(0, C.LIGHT_CYAN);
        grad.addColorStop(0.5, C.LIGHT_BLUE);
        grad.addColorStop(1, C.BLUE);
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, PADDLE_W, PADDLE_H);

        // Top highlight
        ctx.fillStyle = C.WHITE;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(px + 4, py, PADDLE_W - 8, 2);
        ctx.globalAlpha = 1.0;

        // Side accents
        ctx.fillStyle = C.LIGHT_CYAN;
        ctx.fillRect(px, py, 3, PADDLE_H);
        ctx.fillRect(px + PADDLE_W - 3, py, 3, PADDLE_H);
    }

    function drawBall() {
        // Glow
        drawGlowCircle(ball.x, ball.y, BALL_R + 3, 'transparent', C.YELLOW, 15);

        // Ball
        drawGlowCircle(ball.x, ball.y, BALL_R, C.WHITE, C.LIGHT_CYAN, 8);

        // Inner highlight
        ctx.fillStyle = C.LIGHT_CYAN;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, BALL_R * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawBricks() {
        for (const b of bricks) {
            if (!b.alive) continue;

            const hpRatio = b.hp / b.maxHp;

            // Glow
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 6;

            // Brick body
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // If damaged, dim it
            if (hpRatio < 1) {
                ctx.fillStyle = C.BLACK;
                ctx.globalAlpha = 1 - hpRatio;
                ctx.fillRect(b.x, b.y, b.w, b.h);
                ctx.globalAlpha = 1.0;
            }

            // Top edge highlight
            ctx.fillStyle = C.WHITE;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(b.x, b.y, b.w, 2);

            // Left edge highlight
            ctx.globalAlpha = 0.2;
            ctx.fillRect(b.x, b.y, 2, b.h);
            ctx.globalAlpha = 1.0;

            // Damage crack effect
            if (hpRatio < 1 && hpRatio > 0) {
                ctx.strokeStyle = C.BLACK;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(b.x + b.w * 0.3, b.y);
                ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.6);
                ctx.lineTo(b.x + b.w * 0.7, b.y + b.h);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            ctx.shadowBlur = 0;
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1.0;
    }

    // ============================================================
    // SCREEN RENDERERS
    // ============================================================
    function drawTitleScreen() {
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid();

        // Cyberpunk title with glitch effect
        glitchTimer++;
        const glitch = Math.sin(glitchTimer * 0.05) > 0.95;
        const glitchOffsetX = glitch ? (Math.random() - 0.5) * 10 : 0;
        const glitchOffsetY = glitch ? (Math.random() - 0.5) * 4 : 0;

        // Title glow
        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 30;
        ctx.font = 'bold 56px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = C.LIGHT_CYAN;
        ctx.fillText('CYBER', GAME_W / 2 + glitchOffsetX, 200 + glitchOffsetY);

        ctx.shadowColor = C.LIGHT_BLUE;
        ctx.shadowBlur = 25;
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('BREAKER', GAME_W / 2 - glitchOffsetX, 260 + glitchOffsetY);
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
        ctx.moveTo(GAME_W * 0.15, 285);
        ctx.lineTo(GAME_W * 0.85, 285);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Subtitle
        ctx.font = '16px monospace';
        ctx.fillStyle = C.GRAY;
        ctx.globalAlpha = 0.7 + Math.sin(glitchTimer * 0.06) * 0.3;
        ctx.fillText('[ BREAK THE GRID ]', GAME_W / 2, 330);
        ctx.globalAlpha = 1.0;

        // Instructions
        const pulse = 0.6 + Math.sin(glitchTimer * 0.08) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('>> PRESS ANY KEY OR TAP <<', GAME_W / 2, 420);
        ctx.globalAlpha = 1.0;

        ctx.font = '14px monospace';
        ctx.fillStyle = C.GRAY;
        ctx.fillText('← → or DRAG to move paddle', GAME_W / 2, 480);
        ctx.fillText('ENTER or TAP to launch ball', GAME_W / 2, 505);

        // High score
        if (highScore > 0) {
            ctx.fillStyle = C.ORANGE;
            ctx.font = '16px monospace';
            ctx.fillText('HIGH SCORE: ' + highScore, GAME_W / 2, 560);
        }

        drawScanlines();
    }

    function drawGameOverScreen() {
        // Background
        ctx.fillStyle = C.BLACK;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        drawGrid();

        // Game Over title
        const glitch = Math.sin(Date.now() * 0.003) > 0.92;
        const gx = glitch ? (Math.random() - 0.5) * 8 : 0;

        ctx.shadowColor = C.DARK_RED;
        ctx.shadowBlur = 25;
        ctx.font = 'bold 52px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = C.DARK_RED;
        ctx.fillText('GAME OVER', GAME_W / 2 + gx, 180);
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
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('SCORE: ' + score, GAME_W / 2, 270);

        // Wave reached
        ctx.font = '20px monospace';
        ctx.fillStyle = C.LIGHT_BLUE;
        ctx.fillText('WAVE: ' + wave, GAME_W / 2, 310);

        // High score
        const isNew = score >= highScore && score > 0;
        ctx.font = isNew ? 'bold 24px monospace' : '20px monospace';
        ctx.fillStyle = isNew ? C.LIGHT_GREEN : C.ORANGE;
        ctx.fillText(isNew ? '★ NEW HIGH SCORE: ' + score + ' ★' : 'HIGH SCORE: ' + highScore, GAME_W / 2, 370);

        // Play again
        const pulse = 0.6 + Math.sin(Date.now() * 0.006) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = C.YELLOW;
        ctx.fillText('>> PRESS ANY KEY OR TAP TO PLAY AGAIN <<', GAME_W / 2, 460);
        ctx.globalAlpha = 1.0;

        drawScanlines();
    }

    // ============================================================
    // MAIN RENDER
    // ============================================================
    function render() {
        if (gameState === STATE.TITLE) {
            drawTitleScreen();
            return;
        }

        if (gameState === STATE.GAME_OVER) {
            drawParticles();
            updateParticles();
            drawGameOverScreen();
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

        // Border glow
        ctx.strokeStyle = C.DARK_BLUE;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4;
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
