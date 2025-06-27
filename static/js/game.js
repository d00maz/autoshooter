// Main game class
// Note: This file requires enemy.js and skills.js to be loaded first. In your HTML:
// <script src="enemy.js"></script>
// <script src="skills.js"></script>
// <script src="game.js"></script>
class IsometricGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.style.filter = 'brightness(1.4)';
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.accumulated = 0;
        this.step = 1 / 60; // 60 fps

        this.tileSize = 32;
        this.tileWidth = this.tileSize;
        this.tileHeight = this.tileSize;

        this.levelSize = 5000;
        this.visibleTiles = new Map();

        this.player = {
            x: 0,
            y: 0,
            width: this.tileSize * 0.8,
            height: this.tileSize * 0.8,
            boundingBox: {
                width: 0.7,
                height: 0.7
            },
            speed: 1.5,
            direction: { x: 0, y: 0 },
            facing: 0,
            facingAngle: 0,
            health: 100,
            maxHealth: 100,
            isAttacking: false,
            attackCooldown: 0,
            attackRange: this.tileSize * 1.5,
            score: 0,
            level: 1,
            experience: 0,
            experienceToNextLevel: 100,
            skills: [],
            weapon: {
                angle: 0,
                fireRate: 0.6,
                fireTimer: 0,
                damage: 30,
                bulletSpeed: 8,
                autoFire: true,
                type: 'normal',
                level: 1,
                aimDirection: { x: 1, y: 0 },
                visualAngle: 0
            }
        };

        this.basePlayerSpeed = this.player.speed;
        this.enemySpeedRatio = 0.5;

        // Load skills system
        if (typeof createSkills !== 'undefined' && typeof SkillManager !== 'undefined') {
            this.allSkills = createSkills(this);
            this.skillManager = new SkillManager(this);
        } else {
            console.error('Skills system not loaded! Make sure skills.js is included before game.js');
            this.allSkills = {};
            this.skillManager = null;
        }

        // Load enemy system
        if (typeof createEnemies !== 'undefined' && typeof EnemyManager !== 'undefined') {
            this.enemyManager = new EnemyManager(this);
        } else {
            console.error('Enemy system not loaded! Make sure enemy.js is included before game.js');
            this.enemyManager = null;
        }

        this.availableSkills = [];
        this.gamePaused = false;
        this.explosions = [];
        this.bullets = [];
        this.grenades = [];
        this.hitEffects = [];
        this.camera = {
            x: this.player.x,
            y: this.player.y,
            speed: 5
        };

        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 2.5;
        this.enemiesPerSpawn = 1;
        this.maxEnemies = 75;
        this.survivalTime = 0;
        this.showDebug = false;
        this.bossSpawnTimer = 60;
        this.bossCount = 0;

        // Mutation system
        this.mutations = [];
        this.mutationTimer = 300;
        this.availableMutations = [
            {
                id: 'speed_demon',
                name: 'Speed Demon',
                icon: '🌪',
                description: 'All enemies move 30% faster',
                color: '#00ff00',
                apply: () => {
                    this.enemySpeedRatio *= 1.3;
                    this.updateEnemySpeeds();
                }
            },
            {
                id: 'scorched_earth',
                name: 'Scorched Earth',
                icon: '🔥',
                description: 'Random fire zones deal damage',
                color: '#ff4500',
                apply: () => {}
            },
            {
                id: 'frost_snap',
                name: 'Frost Snap',
                icon: '🧊',
                description: 'Random freeze waves affect player',
                color: '#00bfff',
                apply: () => {}
            },
            {
                id: 'volatile',
                name: 'Volatile',
                icon: '☢️',
                description: 'Enemies explode on death',
                color: '#9400d3',
                apply: () => {}
            },
            {
                id: 'thick_hide',
                name: 'Thick Hide',
                icon: '🛡️',
                description: 'Enemies have 50% more health',
                color: '#8b4513',
                apply: () => {}
            },
            {
                id: 'blood_frenzy',
                name: 'Blood Frenzy',
                icon: '🩸',
                description: 'Enemies deal 30% more damage',
                color: '#dc143c',
                apply: () => {}
            }
        ];
        this.fireZones = [];
        this.freezeWaveTimer = 0;
        this.freezeEffect = null;

        this.setupControls();
        const weaponText = document.getElementById('weapon-text');
        if (weaponText) weaponText.textContent = 'Weapon: Pistol';
        this.resize();
        this.updateMutationCards();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame((time) => this.loop(time));
    }

    checkAABBCollision(entityA, entityB) {
        const boxA = entityA.boundingBox;
        const boxB = entityB.boundingBox;
        const aLeft = entityA.x - boxA.width / 2;
        const aRight = entityA.x + boxA.width / 2;
        const bLeft = entityB.x - boxB.width / 2;
        const bRight = entityB.x + boxB.width / 2;
        const aTop = entityA.y - boxA.height / 2;
        const aBottom = entityA.y + boxA.height / 2;
        const bTop = entityB.y - boxB.height / 2;
        const bBottom = entityB.y + boxB.height / 2;
        return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
    }
    isTileSolid(tileType) {
        return tileType === 'water' || tileType === 'rock';
    }
    isPassable(x, y, boundingBox) {
        const halfWidth = boundingBox.width / 2;
        const halfHeight = boundingBox.height / 2;
        const corners = [
            { x: x - halfWidth, y: y - halfHeight },
            { x: x + halfWidth, y: y - halfHeight },
            { x: x - halfWidth, y: y + halfHeight },
            { x: x + halfWidth, y: y + halfHeight },
        ];
        for (const corner of corners) {
            const tile = this.getTileAt(Math.round(corner.x), Math.round(corner.y));
            if (this.isTileSolid(tile.type)) {
                return false;
            }
        }
        return true;
    }
    createHitEffect(x, y, isCritical = false) {
        const particleCount = isCritical ? 12 : 6;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 2 + Math.random() * 3;
            this.hitEffects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3,
                maxLife: 0.3,
                size: isCritical ? 4 : 3,
                color: isCritical ? '#ffff00' : '#ff4444'
            });
        }
    }
    findClosestEnemyBehind() {
        if (this.enemies.length === 0) return null;
        const aimDir = this.player.weapon.aimDirection;
        const aimAngle = Math.atan2(aimDir.y, aimDir.x);
        const behindAngle = aimAngle + Math.PI;
        let closestEnemy = null;
        let smallestAngleDiff = Math.PI;
        for (const enemy of this.enemies) {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = Math.abs(enemyAngle - behindAngle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            if (angleDiff < Math.PI / 2 && angleDiff < smallestAngleDiff) {
                smallestAngleDiff = angleDiff;
                closestEnemy = enemy;
            }
        }
        if (!closestEnemy && this.enemies.length > 0) {
            let minDist = Infinity;
            for (const enemy of this.enemies) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    closestEnemy = enemy;
                }
            }
        }
        return closestEnemy;
    }
    throwGrenade(targetEnemy) {
        if (!targetEnemy) return;
        const dx = targetEnemy.x - this.player.x;
        const dy = targetEnemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;
        this.grenades.push({
            x: this.player.x,
            y: this.player.y,
            targetX: targetEnemy.x,
            targetY: targetEnemy.y,
            dirX: dirX,
            dirY: dirY,
            speed: 5,
            damage: this.player.weapon.damage * 3,
            boundingBox: { width: 0.3, height: 0.3 },
            rotation: 0,
            rotationSpeed: 10
        });
    }

    // --- UI, mutations, controls, bars, skill system, etc... unchanged ---

    triggerMutation() {
        const availableMuts = this.availableMutations.filter(m =>
            !this.mutations.some(active => active.id === m.id)
        );
        if (availableMuts.length === 0) return;
        const mutation = availableMuts[Math.floor(Math.random() * availableMuts.length)];
        this.mutations.push(mutation);
        mutation.apply();
        this.showNotification(`MUTATION: ${mutation.name} - ${mutation.description}`, 5000);
        this.updateMutationCards();
    }
    updateMutationCards() {
        const existingCards = document.getElementById('mutation-cards');
        if (existingCards) {
            existingCards.remove();
        }
        const container = document.createElement('div');
        container.id = 'mutation-cards';
        container.style = `
            position: absolute;
            top: 80px;
            right: 10px;
            display: flex;
            flex-direction: row;
            gap: 3px;
            z-index: 100;
        `;
        this.mutations.forEach((mutation, index) => {
            const card = document.createElement('div');
            card.style = `
                background: ${mutation.color}66;
                border: 1px solid ${mutation.color};
                border-radius: 4px;
                padding: 4px 6px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
                animation-delay: ${index * 0.1}s;
                animation-fill-mode: both;
                font-size: 18px;
            `;
            card.innerHTML = mutation.icon;
            container.appendChild(card);
        });
        document.body.appendChild(container);
        if (!document.getElementById('mutation-styles')) {
            const style = document.createElement('style');
            style.id = 'mutation-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.style = `
            position: absolute;
            top: 140px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            z-index: 100;
            font-size: 12px;
            max-width: 200px;
            text-align: right;
            animation: fadeIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        const fadeStyle = document.getElementById('fade-style');
        if (!fadeStyle) {
            const style = document.createElement('style');
            style.id = 'fade-style';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, duration);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        this.tileSize = minDimension / 10;
        this.tileWidth = this.tileSize;
        this.tileHeight = this.tileSize;
        this.player.width = this.tileSize * 0.8;
        this.player.height = this.tileSize * 0.8;
        this.player.attackRange = this.tileSize * 1.5;
    }
    setupControls() {
        const moveJoystickOptions = {
            zone: document.getElementById('joystick-area'),
            mode: 'static',
            position: { left: '25%', bottom: '50%' },
            color: 'white',
            size: 120
        };
        this.joystick = nipplejs.create(moveJoystickOptions);
        this.joystick.on('move', (evt, data) => {
            const angle = data.angle.radian;
            const force = Math.min(data.force, 1);
            if (force < 0.1) {
                this.player.direction.x = 0;
                this.player.direction.y = 0;
                return;
            }
            this.player.direction.x = Math.cos(angle) * force;
            this.player.direction.y = -Math.sin(angle) * force;
        });
        this.joystick.on('end', () => {
            this.player.direction.x = 0;
            this.player.direction.y = 0;
        });
        const aimJoystickOptions = {
            zone: document.getElementById('aim-joystick'),
            mode: 'static',
            position: { left: '75%', bottom: '50%' },
            color: 'white',
            size: 120
        };
        this.aimJoystick = nipplejs.create(aimJoystickOptions);
        this.aimJoystick.on('move', (evt, data) => {
            const angle = data.angle.radian;
            const force = Math.min(data.force, 1);
            if (force < 0.1) return;
            this.player.weapon.aimDirection.x = Math.cos(angle);
            this.player.weapon.aimDirection.y = -Math.sin(angle);
            this.player.weapon.angle = -angle;
        });
        this.aimJoystick.on('end', () => { });
    }
    updateEnemySpeeds() {
        const baseEnemySpeed = this.player.speed * this.enemySpeedRatio;
        for (const enemy of this.enemies) {
            const speedVariation = enemy.speedVariation || 0.2;
            enemy.speed = baseEnemySpeed * (1 - speedVariation / 2 + Math.random() * speedVariation);
        }
    }
    gainExperience(amount) {
        this.player.experience += amount;
        this.updateExperienceBar();
        if (this.player.experience >= this.player.experienceToNextLevel) {
            this.levelUp();
        }
    }
    updateExperienceBar() {
        const expBar = document.getElementById('exp-value');
        if (expBar) {
            expBar.style.width = `${(this.player.experience / this.player.experienceToNextLevel) * 100}%`;
        }
    }
    levelUp() {
        this.player.level++;
        this.player.experience -= this.player.experienceToNextLevel;
        this.player.experienceToNextLevel = Math.floor(this.player.experienceToNextLevel * 1.15);
        document.getElementById('level-text').textContent = `Level ${this.player.level}`;
        if (this.skillManager) {
            for (const skillId in this.allSkills) {
                const skill = this.allSkills[skillId];
                if (skill.currentStacks > 0 && skill.onLevelUp) {
                    skill.onLevelUp();
                }
            }
        }
        this.showLevelUpMessage();
        this.gamePaused = true;
        this.showSkillSelection();
    }
    showLevelUpMessage() {
        const message = document.createElement('div');
        message.id = 'level-up-message';
        message.innerHTML = `<h2>Level Up!</h2><p>You are now level ${this.player.level}</p>`;
        message.style = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
            animation: fadeIn 0.5s ease-in-out;
        `;
        document.body.appendChild(message);
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 2000);
    }
    showSkillSelection() {
        const availableSkillsForSelection = [];
        for (const skillId in this.allSkills) {
            const skill = this.allSkills[skillId];
            let canTake = true;
            if (skill.maxStacks && skill.currentStacks >= skill.maxStacks) {
                canTake = false;
            }
            if (skill.requires && !skill.requires()) {
                canTake = false;
            }
            if (canTake) {
                availableSkillsForSelection.push(skill);
            }
        }
        if (availableSkillsForSelection.length === 0) {
            this.gamePaused = false;
            return;
        }
        const skillCount = Math.min(3, availableSkillsForSelection.length);
        const shuffled = [...availableSkillsForSelection].sort(() => 0.5 - Math.random());
        const skillChoices = shuffled.slice(0, skillCount);
        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'skill-selection';
        selectionContainer.style = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            width: 80%;
            max-width: 500px;
            border-radius: 10px;
            padding: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: white;
        `;
        const title = document.createElement('h2');
        title.textContent = 'Choose a Skill';
        title.style.marginBottom = '20px';
        selectionContainer.appendChild(title);
        const optionsContainer = document.createElement('div');
        optionsContainer.style = `
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 15px;
        `;
        for (const skill of skillChoices) {
            const skillOption = document.createElement('div');
            skillOption.className = 'skill-option';
            let borderColor = '#3498db';
            if (skill.type === 'weapon_type') borderColor = '#e74c3c';
            if (skill.type === 'weapon_modifier') borderColor = '#f39c12';
            if (skill.type === 'passive') borderColor = '#27ae60';
            if (skill.maxStacks && skill.currentStacks === skill.maxStacks - 1) {
                borderColor = '#ffd700';
            }
            skillOption.style = `
                background-color: rgba(52, 152, 219, 0.3);
                border: 2px solid ${borderColor};
                border-radius: 5px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
                ${skill.maxStacks && skill.currentStacks === skill.maxStacks - 1 ? 'box-shadow: 0 0 10px ' + borderColor + ';' : ''}
            `;
            let stackInfo = '';
            if (skill.maxStacks) {
                const isMaxed = skill.currentStacks >= skill.maxStacks;
                stackInfo = isMaxed ? ' <span style="color: #ffd700;">★MAX★</span>' : ` (${skill.currentStacks}/${skill.maxStacks})`;
            }
            let finalRankNote = '';
            if (skill.maxStacks && skill.currentStacks === skill.maxStacks - 1) {
                finalRankNote = '<br><span style="color: #ffd700;">⚡ FINAL RANK - POWERFUL BONUS! ⚡</span>';
            }
            skillOption.innerHTML = `
                <h3>${skill.name}${stackInfo}</h3>
                <p>${skill.description}${finalRankNote}</p>
            `;
            skillOption.addEventListener('mouseover', () => {
                skillOption.style.backgroundColor = 'rgba(52, 152, 219, 0.5)';
            });
            skillOption.addEventListener('mouseout', () => {
                skillOption.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
            });
            skillOption.addEventListener('click', () => {
                this.selectSkill(skill);
                document.body.removeChild(selectionContainer);
            });
            optionsContainer.appendChild(skillOption);
        }
        selectionContainer.appendChild(optionsContainer);
        document.body.appendChild(selectionContainer);
    }
    selectSkill(skill) {
        if (skill.maxStacks) {
            skill.currentStacks++;
        }
        skill.apply();
        if (skill.maxStacks && skill.currentStacks === skill.maxStacks) {
            this.showNotification(`${skill.name} MAXED! Final rank bonus applied!`);
        } else {
            this.showNotification(`New skill acquired: ${skill.name}`);
        }
        this.gamePaused = false;
    }
    createExplosion(x, y) {
        const explosion = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: this.tileSize * 2,
            lifeTime: 0.3,
            maxLifeTime: 0.3,
            color: '#ff6600'
        };
        this.explosions.push(explosion);
        for (const enemy of this.enemies) {
            if (!enemy) continue;
            const dx = (enemy.x - x);
            const dy = (enemy.y - y);
            const distance = Math.sqrt(dx * dx + dy * dy) * this.tileSize;
            if (distance < explosion.maxRadius) {
                const damageMultiplier = 1 - (distance / explosion.maxRadius);
                enemy.health -= this.player.weapon.damage * 1.5 * damageMultiplier;
            }
        }
    }
    fireBullet() {
        const aimDir = this.player.weapon.aimDirection;
        const gunOffset = this.tileSize * 0.4 / this.tileSize;
        const baseX = this.player.x + aimDir.x * gunOffset;
        const baseY = this.player.y + aimDir.y * gunOffset;
        const createBullet = (direction, damageMultiplier = 1) => {
            const bullet = {
                x: baseX,
                y: baseY,
                speed: this.player.weapon.bulletSpeed,
                direction,
                damage: this.player.weapon.damage * damageMultiplier,
                lifeTime: 2.0,
                explosive: this.player.weapon.explosive,
                piercing: this.player.weapon.piercing,
                boundingBox: { width: 0.2, height: 0.2 }
            };
            if (this.skillManager) {
                this.skillManager.onBulletFire(bullet);
            }
            return bullet;
        };
        switch (this.player.weapon.type) {
            case 'double': {
                const mainAngle = Math.atan2(aimDir.y, aimDir.x);
                const perpX = -Math.sin(mainAngle);
                const perpY = Math.cos(mainAngle);
                const offsetDistance = 0.2;
                for (let i = -1; i <= 1; i += 2) {
                    const bullet = createBullet({ x: aimDir.x, y: aimDir.y });
                    bullet.x += perpX * offsetDistance * i;
                    bullet.y += perpY * offsetDistance * i;
                    this.bullets.push(bullet);
                }
                break;
            }
            case 'triple': {
                const tripleSpreadAngle = Math.PI / 12;
                for (let i = -1; i <= 1; i++) {
                    const angle = Math.atan2(aimDir.y, aimDir.x) + i * tripleSpreadAngle;
                    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
                    this.bullets.push(createBullet(direction, 0.9));
                }
                break;
            }
            case 'quad': {
                const baseAngle = Math.atan2(aimDir.y, aimDir.x);
                const spreadAngle = Math.PI / 16;
                for (let i = 0; i < 4; i++) {
                    const offsetMultiplier = (i - 1.5) * 0.667;
                    const angle = baseAngle + offsetMultiplier * spreadAngle;
                    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
                    this.bullets.push(createBullet(direction, 1.0));
                }
                break;
            }
            case 'shotgun': {
                const spreadCount = 7;
                const spreadAngle = Math.PI / 4;
                for (let i = 0; i < spreadCount; i++) {
                    const angle = Math.atan2(aimDir.y, aimDir.x) + (i - (spreadCount - 1) / 2) * (spreadAngle / (spreadCount - 1));
                    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
                    const bullet = createBullet(direction, 0.7);
                    bullet.lifeTime = 1.0;
                    this.bullets.push(bullet);
                }
                break;
            }
            default: {
                this.bullets.push(createBullet({ x: aimDir.x, y: aimDir.y }));
                break;
            }
        }
    }
    getTileAt(x, y) {
        const key = `${x},${y}`;
        if (this.visibleTiles.has(key)) {
            return this.visibleTiles.get(key);
        }
        let type = 'grass';
        if (Math.abs(x) > this.levelSize || Math.abs(y) > this.levelSize) {
            type = 'water';
        } else if (x % 10 === 0 || y % 10 === 0) {
            type = 'path';
        } else {
            const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            const value = Math.abs(seed) % 1.0;
            if (value < 0.03) {
                type = 'rock';
            } else if (value < 0.06) {
                type = 'water';
            } else if (value < 0.1) {
                type = 'path';
            }
            const distance = Math.sqrt(x * x + y * y);
            if (distance < 10) {
                type = 'grass';
            } else if (x > 100 && y > 100) {
                if (value < 0.5) type = 'path';
            } else if (x < -100 && y < -100) {
                if (value < 0.4) type = 'rock';
            }
        }
        const tile = { x, y, type };
        this.visibleTiles.set(key, tile);
        if (this.frameCount % 60 === 0) {
            this.pruneDistantTiles();
        }
        return tile;
    }
    pruneDistantTiles() {
        const playerX = this.player.x;
        const playerY = this.player.y;
        const maxDistance = 80;
        const entries = Array.from(this.visibleTiles.entries());
        const filteredEntries = entries.filter(([key, tile]) => {
            const dx = tile.x - playerX;
            const dy = tile.y - playerY;
            return (dx * dx + dy * dy) <= maxDistance * maxDistance;
        });
        this.visibleTiles = new Map(filteredEntries);
    }

    spawnEnemy() {
        if (!this.enemyManager) return;
        if (this.enemies.length >= this.maxEnemies) return;
        const groupSize = Math.min(
            Math.floor(Math.random() * 2) + Math.floor(this.enemiesPerSpawn),
            this.maxEnemies - this.enemies.length
        );
        const baseAngle = Math.random() * Math.PI * 2;
        const minDistance = 5;
        const maxDistance = 8;
        for (let i = 0; i < groupSize; i++) {
            const angleVariation = (Math.random() - 0.5) * Math.PI / 4;
            const angle = baseAngle + angleVariation;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;
            const spawnTile = this.getTileAt(Math.round(x), Math.round(y));
            if (this.isTileSolid(spawnTile.type)) continue;
            this.enemyManager.spawnEnemy(x, y);
        }
    }
    spawnBoss() {
        if (!this.enemyManager) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 8;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const spawnTile = this.getTileAt(Math.round(x), Math.round(y));
        if (this.isTileSolid(spawnTile.type)) {
            this.bossSpawnTimer = this.survivalTime + 0.1;
            return;
        }
        this.enemyManager.spawnBoss(x, y);
        this.showNotification('BOSS SPAWNED!', 4000);
    }

    update(dt) {
        if (this.gamePaused) return;
        this.survivalTime += dt;

        const moveX = this.player.direction.x * this.player.speed * dt;
        const moveY = this.player.direction.y * this.player.speed * dt;
        if (this.isPassable(this.player.x + moveX, this.player.y, this.player.boundingBox)) {
            this.player.x += moveX;
        }
        if (this.isPassable(this.player.x, this.player.y + moveY, this.player.boundingBox)) {
            this.player.y += moveY;
        }
        if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
            this.player.facingAngle = Math.atan2(-moveY, moveX);
        }

        if (this.skillManager) this.skillManager.onUpdate(dt);
        if (this.player.weapon.angle !== undefined) {
            let targetAngle = this.player.weapon.angle;
            let currentAngle = this.player.weapon.visualAngle;
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            this.player.weapon.visualAngle += diff * 0.2;
        }
        if (this.player.weapon.autoFire) {
            this.player.weapon.fireTimer += dt;
            if (this.player.weapon.fireTimer >= this.player.weapon.fireRate) {
                this.fireBullet();
                this.player.weapon.fireTimer = 0;
            }
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.direction.x * bullet.speed * dt;
            bullet.y += bullet.direction.y * bullet.speed * dt;
            bullet.lifeTime -= dt;
            if (bullet.lifeTime <= 0) {
                this.bullets.splice(i, 1);
                continue;
            }
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.checkAABBCollision(bullet, enemy)) {
                    let damage = bullet.damage;
                    let isCritical = false;
                    if (this.skillManager) {
                        damage = this.skillManager.modifyDamage(damage, enemy, bullet);
                        isCritical = bullet.isCritical || false;
                    }
                    enemy.health -= damage;
                    enemy.hitFlash = 0.15;
                    this.createHitEffect(bullet.x, bullet.y, isCritical);
                    if (this.skillManager) {
                        this.skillManager.onHit(bullet, enemy, damage);
                    }
                    if (!bullet.piercing) {
                        this.bullets.splice(i, 1);
                        break;
                    }
                }
            }
        }

        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const grenade = this.grenades[i];
            grenade.x += grenade.dirX * grenade.speed * dt;
            grenade.y += grenade.dirY * grenade.speed * dt;
            grenade.rotation += grenade.rotationSpeed * dt;
            const dx = grenade.targetX - grenade.x;
            const dy = grenade.targetY - grenade.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);
            if (distToTarget < 0.5) {
                const explosion = {
                    x: grenade.x,
                    y: grenade.y,
                    radius: 0,
                    maxRadius: this.tileSize * 2.5,
                    lifeTime: 0.3,
                    maxLifeTime: 0.3,
                    color: '#ff6600'
                };
                this.explosions.push(explosion);
                for (const enemy of this.enemies) {
                    if (!enemy) continue;
                    const dx = (enemy.x - grenade.x);
                    const dy = (enemy.y - grenade.y);
                    const distance = Math.sqrt(dx * dx + dy * dy) * this.tileSize;
                    if (distance < explosion.maxRadius) {
                        const damageMultiplier = 1 - (distance / explosion.maxRadius);
                        enemy.health -= grenade.damage * damageMultiplier;
                    }
                }
                this.grenades.splice(i, 1);
            }
        }

        // --- ENEMY UPDATE: USE ENEMY MANAGER ---
        if (this.enemyManager) {
            this.enemyManager.updateEnemies(dt);
        }

        // --- Player-Enemy Collision and enemy movement (kept in game.js for now) ---
        for (const enemy of this.enemies) {
            if (enemy.hitFlash > 0) {
                enemy.hitFlash -= dt;
            }
            if (this.checkAABBCollision(this.player, enemy)) {
                if (this.skillManager && this.skillManager.canDodge()) {
                    continue;
                }
                let damageTaken = enemy.damage * dt;
                if (this.mutations.some(m => m.id === 'blood_frenzy')) {
                    damageTaken *= 1.3;
                }
                if (this.skillManager) {
                    damageTaken = this.skillManager.modifyDamageTaken(damageTaken, enemy);
                    this.skillManager.onDamageTaken(enemy, damageTaken);
                }
                this.player.health -= damageTaken;
                if (this.player.health <= 0) {
                    const minutes = Math.floor(this.survivalTime / 60);
                    const seconds = Math.floor(this.survivalTime % 60);
                    alert(`Game Over!\n\nSurvival Time: ${minutes}:${seconds.toString().padStart(2, '0')}\nZombies Killed: ${this.player.score / 10}\nLevel Reached: ${this.player.level}`);
                    window.location.reload();
                }
            }
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0.1) {
                const moveX = (dx / length) * enemy.speed * dt;
                const moveY = (dy / length) * enemy.speed * dt;
                if (this.isPassable(enemy.x + moveX, enemy.y, enemy.boundingBox)) {
                    enemy.x += moveX;
                }
                if (this.isPassable(enemy.x, enemy.y + moveY, enemy.boundingBox)) {
                    enemy.y += moveY;
                }
            }
        }

        for (let i = this.hitEffects.length - 1; i >= 0; i--) {
            const particle = this.hitEffects[i];
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life -= dt;
            if (particle.life <= 0) {
                this.hitEffects.splice(i, 1);
            }
        }
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.lifeTime -= dt;
            explosion.radius = explosion.maxRadius * (1 - explosion.lifeTime / explosion.maxLifeTime);
            if (explosion.lifeTime <= 0) {
                this.explosions.splice(i, 1);
            }
        }
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            if (this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
            }
            this.enemySpawnTimer = 0;
            this.enemySpawnRate = Math.max(0.3, this.enemySpawnRate - 0.01);
            if (this.enemiesPerSpawn < 8) {
                this.enemiesPerSpawn += 0.03;
            }
        }
        if (this.survivalTime >= this.bossSpawnTimer) {
            this.spawnBoss();
            this.bossCount++;
            this.bossSpawnTimer = this.survivalTime + Math.max(30, 60 - this.bossCount * 5);
        }
        if (this.survivalTime >= this.mutationTimer) {
            this.triggerMutation();
            this.mutationTimer = this.survivalTime + 300;
        }
        if (this.mutations.some(m => m.id === 'scorched_earth')) {
            if (Math.random() < 0.01) {
                const fireZone = {
                    x: this.player.x + (Math.random() - 0.5) * 20,
                    y: this.player.y + (Math.random() - 0.5) * 20,
                    radius: 1.5 + Math.random() * 2,
                    duration: 5,
                    damage: 15
                };
                this.fireZones.push(fireZone);
            }
            for (let i = this.fireZones.length - 1; i >= 0; i--) {
                const zone = this.fireZones[i];
                zone.duration -= dt;
                if (zone.duration <= 0) {
                    this.fireZones.splice(i, 1);
                    continue;
                }
                const dx = this.player.x - zone.x;
                const dy = this.player.y - zone.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= zone.radius) {
                    this.player.health -= zone.damage * dt;
                    document.getElementById('health-value').style.width =
                        `${(this.player.health / this.player.maxHealth) * 100}%`;
                    if (this.player.health <= 0) {
                        const minutes = Math.floor(this.survivalTime / 60);
                        const seconds = Math.floor(this.survivalTime % 60);
                        alert(`Game Over!\n\nSurvival Time: ${minutes}:${seconds.toString().padStart(2, '0')}\nZombies Killed: ${this.player.score / 10}\nLevel Reached: ${this.player.level}`);
                        window.location.reload();
                    }
                }
            }
        }
        if (this.mutations.some(m => m.id === 'frost_snap')) {
            this.freezeWaveTimer += dt;
            if (this.freezeWaveTimer > 10 + Math.random() * 10) {
                this.freezeWaveTimer = 0;
                const originalSpeed = this.player.speed;
                this.player.speed *= 0.5;
                this.showNotification('Freeze wave! Movement slowed!', 2000);
                this.freezeEffect = {
                    duration: 2,
                    maxDuration: 2
                };
                setTimeout(() => {
                    this.player.speed = originalSpeed;
                    this.updateEnemySpeeds();
                }, 2000);
            }
        }
        if (this.freezeEffect) {
            this.freezeEffect.duration -= dt;
            if (this.freezeEffect.duration <= 0) {
                delete this.freezeEffect;
            }
        }
    }

    // --- RENDERING (unchanged) ---

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.camera.x += (this.player.x - this.camera.x) / this.camera.speed;
        this.camera.y += (this.player.y - this.camera.y) / this.camera.speed;
        const margin = 3;
        const tilesX = Math.ceil(this.canvas.width / this.tileSize) + margin * 2;
        const tilesY = Math.ceil(this.canvas.height / this.tileSize) + margin * 2;
        const visibleMinX = Math.floor(this.camera.x - tilesX / 2);
        const visibleMaxX = Math.ceil(this.camera.x + tilesX / 2);
        const visibleMinY = Math.floor(this.camera.y - tilesY / 2);
        const visibleMaxY = Math.ceil(this.camera.y + tilesY / 2);
        for (let y = visibleMinY; y <= visibleMaxY; y++) {
            for (let x = visibleMinX; x <= visibleMaxX; x++) {
                this.getTileAt(x, y);
            }
        }
        for (let y = visibleMinY; y <= visibleMaxY; y++) {
            for (let x = visibleMinX; x <= visibleMaxX; x++) {
                const tile = this.getTileAt(x, y);
                const screenX = (x - this.camera.x) * this.tileSize + this.canvas.width / 2;
                const screenY = (y - this.camera.y) * this.tileSize + this.canvas.height / 2;
                this.drawTile(screenX, screenY, tile.type);
            }
        }
        for (const enemy of this.enemies) {
            const screenX = (enemy.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (enemy.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            const margin = this.tileSize * 1.5;
            if (
                screenX > -margin && screenX < this.canvas.width + margin &&
                screenY > -margin && screenY < this.canvas.height + margin
            ) {
                this.drawEnemy(screenX, screenY, enemy);
            }
        }
        const playerScreenX = (this.player.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
        const playerScreenY = (this.player.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
        this.drawPlayer(playerScreenX, playerScreenY);
        for (const particle of this.hitEffects) {
            const screenX = (particle.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (particle.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            this.ctx.globalAlpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1.0;
        }
        for (const zone of this.fireZones || []) {
            const screenX = (zone.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (zone.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            this.ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, zone.radius * this.tileSize);
            gradient.addColorStop(0, '#ff6600');
            gradient.addColorStop(0.5, '#ff3300');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, zone.radius * this.tileSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.6;
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, zone.radius * this.tileSize * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
        if (this.freezeEffect) {
            this.ctx.globalAlpha = 0.3 * (this.freezeEffect.duration / this.freezeEffect.maxDuration);
            this.ctx.fillStyle = '#00bfff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            const crystalCount = 20;
            for (let i = 0; i < crystalCount; i++) {
                const angle = (i / crystalCount) * Math.PI * 2;
                const x = this.canvas.width / 2 + Math.cos(angle) * this.canvas.width * 0.7;
                const y = this.canvas.height / 2 + Math.sin(angle) * this.canvas.height * 0.7;
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(angle);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.globalAlpha = 0.5 * (this.freezeEffect.duration / this.freezeEffect.maxDuration);
                for (let j = 0; j < 6; j++) {
                    this.ctx.rotate(Math.PI / 3);
                    this.ctx.fillRect(-1, -20, 2, 40);
                }
                this.ctx.restore();
            }
            this.ctx.globalAlpha = 1.0;
        }
        for (const explosion of this.explosions) {
            const screenX = (explosion.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (explosion.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            this.ctx.globalAlpha = explosion.lifeTime / explosion.maxLifeTime;
            this.ctx.fillStyle = explosion.color;
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, explosion.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1.0;
        }
        this.drawBullets();
        this.drawGrenades();
        this.drawMinimap();
    }
    drawBullets() {
        this.ctx.fillStyle = '#ffff00';
        this.ctx.shadowColor = '#ffaa00';
        this.ctx.shadowBlur = 5;
        for (const bullet of this.bullets) {
            const screenX = (bullet.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (bullet.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, this.tileSize / 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }
    drawGrenades() {
        for (const grenade of this.grenades) {
            const screenX = (grenade.x - this.camera.x) * this.tileSize + this.canvas.width / 2;
            const screenY = (grenade.y - this.camera.y) * this.tileSize + this.canvas.height / 2;
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            this.ctx.rotate(grenade.rotation);
            this.ctx.fillStyle = '#556b2f';
            this.ctx.fillRect(-this.tileSize / 6, -this.tileSize / 10, this.tileSize / 3, this.tileSize / 5);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(-this.tileSize / 12, -this.tileSize / 8, this.tileSize / 6, this.tileSize / 20);
            this.ctx.restore();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, this.tileSize / 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }
    }
    drawMinimap() {
        const mapSize = 100;
        const mapX = 20;
        const mapY = 20;
        const mapScale = mapSize / 200;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(mapX, mapY, mapSize, mapSize);
        const playerMapX = mapX + mapSize / 2;
        const playerMapY = mapY + mapSize / 2;
        this.ctx.fillStyle = '#4a6741';
        this.ctx.beginPath();
        this.ctx.arc(playerMapX, playerMapY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        for (const enemy of this.enemies) {
            const relX = (enemy.x - this.player.x) * mapScale;
            const relY = (enemy.y - this.player.y) * mapScale;
            const enemyMapX = playerMapX + relX;
            const enemyMapY = playerMapY + relY;
            if (enemyMapX >= mapX && enemyMapX <= mapX + mapSize &&
                enemyMapY >= mapY && enemyMapY <= mapY + mapSize) {
                this.ctx.fillStyle = enemy.isBoss ? '#ff0000' : enemy.color;
                this.ctx.beginPath();
                this.ctx.arc(enemyMapX, enemyMapY, enemy.isBoss ? 4 : 2 * enemy.size, 0, Math.PI * 2);
                this.ctx.fill();
                if (enemy.isBoss) {
                    this.ctx.strokeStyle = '#ffff00';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        const timeToNextMutation = Math.max(0, this.mutationTimer - this.survivalTime);
        if (timeToNextMutation > 0) {
            const minutes = Math.floor(timeToNextMutation / 60);
            const seconds = Math.floor(timeToNextMutation % 60);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(mapX, mapY + mapSize + 5, mapSize, 20);
            this.ctx.fillStyle = '#ff6600';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Next: ${minutes}:${seconds.toString().padStart(2, '0')}`, mapX + mapSize / 2, mapY + mapSize + 18);
            this.ctx.textAlign = 'left';
        }
    }
    drawEnemy(x, y, enemy) {
        if (enemy.isBoss) {
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 20;
        }
        if (enemy.hitFlash > 0) {
            this.ctx.fillStyle = '#ffffff';
        } else {
            this.ctx.fillStyle = enemy.color;
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tileSize / 3 * enemy.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = enemy.isBoss ? '#ffff00' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = enemy.isBoss ? 3 : 2;
        this.ctx.stroke();
        if (enemy.isBoss) {
            this.ctx.shadowBlur = 0;
        }
        if (enemy.hitFlash <= 0) {
            this.ctx.fillStyle = '#ff0000';
            const eyeOffset = this.tileSize / 8 * enemy.size;
            const eyeSize = this.tileSize / 20 * enemy.size;
            this.ctx.beginPath();
            this.ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        const healthPercent = enemy.health / enemy.maxHealth;
        const barWidth = this.tileSize * 0.8 * enemy.size;
        const barHeight = enemy.isBoss ? 8 : 4;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - barWidth / 2, y - this.tileSize / 2 * enemy.size - 10, barWidth, barHeight);
        this.ctx.fillStyle = enemy.isBoss ? '#ff0000' : '#8b0000';
        this.ctx.fillRect(x - barWidth / 2, y - this.tileSize / 2 * enemy.size - 10, barWidth * healthPercent, barHeight);
    }
    drawPlayer(x, y) {
        this.ctx.fillStyle = '#4a6741';
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tileSize / 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#2a3a2a';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        if (this.player.weapon.aimDirection.x !== 0 || this.player.weapon.aimDirection.y !== 0) {
            this.ctx.save();
            const gradient = this.ctx.createLinearGradient(x, y,
                x + this.player.weapon.aimDirection.x * this.tileSize * 2,
                y + this.player.weapon.aimDirection.y * this.tileSize * 2);
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            const angle = Math.atan2(this.player.weapon.aimDirection.y, this.player.weapon.aimDirection.x);
            const spread = Math.PI / 6;
            this.ctx.arc(x, y, this.tileSize * 4, angle - spread, angle + spread);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }
        if (this.player.weapon.aimDirection.x !== 0 || this.player.weapon.aimDirection.y !== 0) {
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            const aimLength = this.tileSize * 3;
            const endX = x + this.player.weapon.aimDirection.x * aimLength;
            const endY = y + this.player.weapon.aimDirection.y * aimLength;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            this.ctx.restore();
        }
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(this.player.weapon.visualAngle);
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(this.tileSize / 4, -this.tileSize / 12, this.tileSize / 3, this.tileSize / 6);
        this.ctx.restore();
    }
    drawTile(x, y, type) {
        switch (type) {
            case 'grass':
                this.ctx.fillStyle = '#2d3a2d';
                break;
            case 'path':
                this.ctx.fillStyle = '#3a3a3a';
                break;
            case 'water':
                this.ctx.fillStyle = '#1a2633';
                break;
            case 'rock':
                this.ctx.fillStyle = '#2a2a2a';
                break;
            default:
                this.ctx.fillStyle = '#222';
        }
        this.ctx.fillRect(x - this.tileSize / 2, y - this.tileSize / 2, this.tileSize, this.tileSize);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - this.tileSize / 2, y - this.tileSize / 2, this.tileSize, this.tileSize);
    }
    loop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.accumulated += dt;
        while (this.accumulated >= this.step) {
            this.update(this.step);
            this.accumulated -= this.step;
        }
        this.render();
        requestAnimationFrame((time) => this.loop(time));
    }
}

window.addEventListener('load', () => {
    if (typeof createSkills === 'undefined' || typeof SkillManager === 'undefined') {
        console.error('Skills system not loaded! Make sure to include skills.js before game.js');
        alert('Game failed to load: skills.js is missing or incomplete. Please include it before game.js in your HTML.');
        return;
    }
    if (typeof createEnemies === 'undefined' || typeof EnemyManager === 'undefined') {
        console.error('Enemy system not loaded! Make sure to include enemy.js before game.js');
        alert('Game failed to load: enemy.js is missing or incomplete. Please include it before game.js in your HTML.');
        return;
    }
    if (typeof nipplejs === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipplejs.min.js';
        script.onload = () => {
            new IsometricGame();
        };
        document.body.appendChild(script);
    } else {
        new IsometricGame();
    }
});
