class BreakoutGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Game state
        this.gameState = 'menu'; // menu, playing, paused, gameOver, respawning
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.lastInputTime = 0;
        this.countdown = 3;
        this.countdownInterval = null;
        this.respawnTimer = null;
        this.respawnCountdown = 1.5;
        
        // Ball properties
        this.ball = {
            x: this.width / 2,
            y: this.height - 30,
            dx: 0,
            dy: 0,
            radius: 8,
            speed: 4,
            angle: 0
        };
        
        // Paddle properties
        this.paddle = {
            width: 100,
            height: 10,
            x: (this.width - 100) / 2,
            isLocked: false
        };
        
        // Brick properties
        this.brickRowCount = 5;
        this.brickColumnCount = 9;
        this.brickWidth = 75;
        this.brickHeight = 20;
        this.brickPadding = 10;
        this.brickOffsetTop = 30;
        this.brickOffsetLeft = 30;
        this.bricks = this.generateBricks();
        
        // Game controls
        this.rightPressed = false;
        this.leftPressed = false;
        
        // Event listeners
        this.setupEventListeners();
        
        // Start the game loop
        this.lastTime = 0;
        this.animate(0);
    }
    
    generateBricks() {
        const bricks = [];
        const colors = ['#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE', '#448AFF'];
        
        for (let c = 0; c < this.brickColumnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                bricks[c][r] = {
                    x: c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft,
                    y: r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop,
                    status: 1,
                    color: colors[r % colors.length]
                };
            }
        }
        return bricks;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') {
                this.rightPressed = true;
            } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
                this.leftPressed = true;
            } else if (e.key === ' ') {
                const now = Date.now();
                if (now - this.lastInputTime < 500) return;
                this.lastInputTime = now;
                
                if (this.gameState === 'gameOver') {
                    this.resetGame();
                } else if (this.gameState === 'menu') {
                    this.startGame();
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                } else if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') {
                this.rightPressed = false;
            } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
                this.leftPressed = false;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const relativeX = e.clientX - this.canvas.offsetLeft;
            if (relativeX > 0 && relativeX < this.width) {
                this.paddle.x = relativeX - this.paddle.width / 2;
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.countdown = 3;
        this.resetBall();
        
        // Start countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            this.countdown--;
            if (this.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.serveBall();
            }
        }, 1000);
    }
    
    handleLifeLoss() {
        this.lives--;
        if (this.lives > 0) {
            this.gameState = 'respawning';
            this.paddle.isLocked = true;
            this.resetBall(false);
            this.respawnCountdown = 1.5;
            
            // Clear any existing respawn timer
            if (this.respawnTimer) {
                clearInterval(this.respawnTimer);
            }
            
            // Start respawn countdown
            this.respawnTimer = setInterval(() => {
                this.respawnCountdown -= 0.1;
                if (this.respawnCountdown <= 0) {
                    clearInterval(this.respawnTimer);
                    this.gameState = 'playing';
                    this.paddle.isLocked = false;
                    this.serveBall();
                }
            }, 100);
        } else {
            this.gameState = 'gameOver';
        }
    }
    
    resetBall(centerOnly = true) {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.height - 30;
        if (centerOnly) {
            this.ball.dx = 0;
            this.ball.dy = 0;
        }
    }
    
    serveBall() {
        // Random angle between 30°-60°
        this.ball.angle = (Math.random() * 30 + 30) * Math.PI / 180;
        this.ball.dx = this.ball.speed * Math.cos(this.ball.angle) * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -this.ball.speed * Math.sin(this.ball.angle);
    }
    
    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.bricks = this.generateBricks();
        this.startGame();
    }
    
    handleCollisions() {
        // Wall collisions
        if (this.ball.x + this.ball.dx > this.width - this.ball.radius || this.ball.x + this.ball.dx < this.ball.radius) {
            this.ball.dx = -this.ball.dx;
        }
        
        if (this.ball.y + this.ball.dy < this.ball.radius) {
            this.ball.dy = -this.ball.dy;
        } else if (this.ball.y + this.ball.dy > this.height - this.ball.radius) {
            if (this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.width) {
                // Calculate angle based on where the ball hits the paddle
                const hitPoint = (this.ball.x - this.paddle.x) / this.paddle.width;
                const angle = (hitPoint - 0.5) * Math.PI / 3; // ±60 degrees
                const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
                this.ball.dx = speed * Math.sin(angle);
                this.ball.dy = -speed * Math.cos(angle);
            } else {
                this.handleLifeLoss();
            }
        }
        
        // Brick collisions
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const b = this.bricks[c][r];
                if (b.status === 1) {
                    if (
                        this.ball.x > b.x &&
                        this.ball.x < b.x + this.brickWidth &&
                        this.ball.y > b.y &&
                        this.ball.y < b.y + this.brickHeight
                    ) {
                        this.ball.dy = -this.ball.dy;
                        b.status = 0;
                        this.score += 10;
                        
                        // Increase speed every 5 bricks
                        if (this.score % 50 === 0) {
                            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
                            const angle = Math.atan2(this.ball.dy, this.ball.dx);
                            const newSpeed = speed * 1.1;
                            this.ball.dx = newSpeed * Math.cos(angle);
                            this.ball.dy = newSpeed * Math.sin(angle);
                        }
                        
                        // Check if all bricks are destroyed
                        if (this.checkWin()) {
                            this.level++;
                            this.resetLevel();
                        }
                    }
                }
            }
        }
    }
    
    checkWin() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }
    
    resetLevel() {
        this.bricks = this.generateBricks();
        this.resetBall();
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Move paddle if not locked
        if (!this.paddle.isLocked) {
            if (this.rightPressed && this.paddle.x < this.width - this.paddle.width) {
                this.paddle.x += 7;
            } else if (this.leftPressed && this.paddle.x > 0) {
                this.paddle.x -= 7;
            }
        }
        
        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        this.handleCollisions();
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw game elements
        this.drawBall();
        this.drawPaddle();
        this.drawBricks();
        this.drawScore();
        this.drawLives();
        
        // Draw respawn countdown
        if (this.gameState === 'respawning') {
            this.drawMessage(`READY? ${this.respawnCountdown.toFixed(1)}`);
        }
        
        // Draw initial countdown
        if (this.gameState === 'playing' && this.countdown > 0) {
            this.drawMessage(this.countdown.toString());
        }
        
        // Draw game state messages
        if (this.gameState === 'menu') {
            this.drawMessage('Press SPACE to Start');
        } else if (this.gameState === 'paused') {
            this.drawMessage('PAUSED - Press SPACE to Continue');
        } else if (this.gameState === 'gameOver') {
            this.drawMessage('GAME OVER - Press SPACE to Restart');
        }
    }
    
    drawBall() {
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    drawPaddle() {
        this.ctx.beginPath();
        this.ctx.rect(this.paddle.x, this.height - this.paddle.height, this.paddle.width, this.paddle.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    drawBricks() {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    this.ctx.beginPath();
                    this.ctx.rect(
                        this.bricks[c][r].x,
                        this.bricks[c][r].y,
                        this.brickWidth,
                        this.brickHeight
                    );
                    this.ctx.fillStyle = this.bricks[c][r].color;
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
    }
    
    drawScore() {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Score: ${this.score}`, 8, 20);
    }
    
    drawLives() {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Lives: ${this.lives}`, this.width - 65, 20);
    }
    
    drawMessage(text) {
        this.ctx.font = '32px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, this.width / 2, this.height / 2);
        this.ctx.textAlign = 'left';
    }
    
    animate(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame((timestamp) => this.animate(timestamp));
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    new BreakoutGame(canvas);
}); 