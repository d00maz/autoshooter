// Main game class
class IsometricGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
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
            x: 0, // Position in world tile coordinates
            y: 0, // Position in world tile coordinates
            width: this.tileSize * 0.8,
            height: this.tileSize * 0.8,
            // NEW: Bounding box for 2D collision (width/height in tile units)
            boundingBox: {
                width: 0.7,
                height: 0.7
            },
            speed: 1.2, // Reduced from 1.5
            direction: { x: 0, y: 0 },
            facing: 0,
            facingAngle: 0,
            health: 80, // Reduced from 100
            maxHealth: 80, // Reduced from 100
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
                fireRate: 0.6, // Increased from 0.6 (slower firing)
                fireTimer: 0,
                damage: 25, // Reduced from 10
                bulletSpeed: 8, // Reduced from 12
                autoFire: true,
                type: 'normal',
                level: 1,
                aimDirection: { x: 1, y: 0 },
                visualAngle: 0
            }
        };

        this.basePlayerSpeed = this.player.speed;
        this.enemySpeedRatio = 0.5; // Increased from 0.4 to compensate for slower player

        this.allSkills = {
            health_boost: {
                id: 'health_boost',
                name: 'First Aid Kit',
                description: 'Find medical supplies (+15 health)',
                type: 'passive',
                maxStacks: 15,
                currentStacks: 0,
                apply: () => {
                    this.player.maxHealth += 15;
                    this.player.health += 15;
                    document.getElementById('health-value').style.width =
                        `${(this.player.health / this.player.maxHealth) * 100}%`;
                }
            },
            speed_boost: {
                id: 'speed_boost',
                name: 'Adrenaline Rush',
                description: 'Move 10% faster when escaping zombies',
                type: 'passive',
                maxStacks: 8,
                currentStacks: 0,
                apply: () => {
                    this.player.speed *= 1.10;
                    this.updateEnemySpeeds();
                }
            },
            health_regen: {
                id: 'health_regen',
                name: 'Survival Instinct',
                description: 'Slowly heal wounds over time (+0.5 HP/sec)',
                type: 'passive',
                maxStacks: 5,
                currentStacks: 0,
                apply: () => {
                    if (!this.player.healthRegen) this.player.healthRegen = 0;
                    this.player.healthRegen += 0.5;
                }
            },
            damage_resistance: {
                id: 'damage_resistance',
                name: 'Reinforced Armor',
                description: 'Take 5% less damage from zombie attacks',
                type: 'passive',
                maxStacks: 8,
                currentStacks: 0,
                apply: () => {
                    if (!this.player.damageResistance) this.player.damageResistance = 0;
                    this.player.damageResistance = Math.min(0.4, this.player.damageResistance + 0.05);
                }
            },
            damage_up: {
                id: 'damage_up',
                name: 'Hollow Points',
                description: 'More stopping power (+3 damage)',
                type: 'weapon_upgrade',
                maxStacks: 15,
                currentStacks: 0,
                apply: () => {
                    this.player.weapon.damage += 3;
                }
            },
            fire_rate_up: {
                id: 'fire_rate_up',
                name: 'Hair Trigger',
                description: 'Shoot 15% faster',
                type: 'weapon_upgrade',
                maxStacks: 8,
                currentStacks: 0,
                apply: () => {
                    this.player.weapon.fireRate *= 0.85;
                }
            },
            bullet_speed_up: {
                id: 'bullet_speed_up',
                name: 'High Velocity Rounds',
                description: 'Bullets travel 20% faster',
                type: 'weapon_upgrade',
                maxStacks: 8,
                currentStacks: 0,
                apply: () => {
                    this.player.weapon.bulletSpeed *= 1.20;
                }
            },
            double_shot: {
                id: 'double_shot',
                name: 'Dual Barrel',
                description: 'Modified weapon fires two bullets (Requires Level 3)',
                type: 'weapon_type',
                requires: () => this.player.weapon.level === 1 && this.player.level >= 3,
                apply: () => {
                    this.player.weapon.type = 'double';
                    this.player.weapon.level = 2;
                    document.getElementById('weapon-text').textContent = 'Weapon: Dual Barrel';
                }
            },
            triple_shot: {
                id: 'triple_shot',
                name: 'Burst Fire',
                description: 'Three-round burst weapon (Requires Level 8)',
                type: 'weapon_type',
                requires: () => this.player.weapon.level === 2 && this.player.level >= 8,
                apply: () => {
                    this.player.weapon.type = 'triple';
                    this.player.weapon.level = 3;
                    document.getElementById('weapon-text').textContent = 'Weapon: Burst Fire';
                }
            },
            quad_shot: {
                id: 'quad_shot',
                name: 'Makeshift Turret',
                description: 'Jury-rigged quad barrel (Requires Level 15)',
                type: 'weapon_type',
                requires: () => this.player.weapon.level === 3 && this.player.level >= 15,
                apply: () => {
                    this.player.weapon.type = 'quad';
                    this.player.weapon.level = 4;
                    document.getElementById('weapon-text').textContent = 'Weapon: Makeshift Turret';
                }
            },
            shotgun: {
                id: 'shotgun',
                name: 'Combat Shotgun',
                description: 'Devastating close-range spread (Requires Level 25)',
                type: 'weapon_type',
                requires: () => this.player.weapon.level === 4 && this.player.level >= 25,
                apply: () => {
                    this.player.weapon.type = 'shotgun';
                    this.player.weapon.level = 5;
                    document.getElementById('weapon-text').textContent = 'Weapon: Combat Shotgun';
                }
            },
            explosive_rounds: {
                id: 'explosive_rounds',
                name: 'Incendiary Rounds',
                description: 'Bullets create fiery explosions (Requires Level 10)',
                type: 'weapon_modifier',
                requires: () => this.player.weapon.level >= 2 && !this.player.weapon.explosive && this.player.level >= 10,
                apply: () => {
                    this.player.weapon.explosive = true;
                }
            },
            piercing_bullets: {
                id: 'piercing_bullets',
                name: 'Armor Piercing',
                description: 'Bullets tear through multiple zombies (Requires Level 6)',
                type: 'weapon_modifier',
                requires: () => this.player.weapon.level >= 2 && !this.player.weapon.piercing && this.player.level >= 6,
                apply: () => {
                    this.player.weapon.piercing = true;
                }
            },
            dodge_chance: {
                id: 'dodge_chance',
                name: 'Evasive Maneuvers',
                description: '10% chance to dodge zombie attacks',
                type: 'passive',
                maxStacks: 5,
                currentStacks: 0,
                apply: () => {
                    if (!this.player.dodgeChance) this.player.dodgeChance = 0;
                    this.player.dodgeChance = Math.min(0.5, this.player.dodgeChance + 0.1);
                }
            },
            knockback: {
                id: 'knockback',
                name: 'Stopping Power',
                description: 'Bullets push zombies back slightly (Requires Level 5)',
                type: 'weapon_modifier',
                requires: () => this.player.level >= 5 && !this.player.weapon.knockback,
                apply: () => {
                    this.player.weapon.knockback = true;
                }
            },
            life_steal: {
                id: 'life_steal',
                name: 'Blood Transfusion',
                description: 'Heal 1 HP for every 10 zombies killed (Requires Level 7)',
                type: 'passive',
                maxStacks: 3,
                currentStacks: 0,
                requires: () => this.player.level >= 7,
                apply: () => {
                    if (!this.player.lifeSteal) this.player.lifeSteal = 0;
                    this.player.lifeSteal += 1;
                    if (!this.player.killCount) this.player.killCount = 0;
                }
            },
            critical_chance: {
                id: 'critical_chance',
                name: 'Sharpshooter',
                description: '5% chance for double damage',
                type: 'weapon_upgrade',
                maxStacks: 8,
                currentStacks: 0,
                apply: () => {
                    if (!this.player.weapon.critChance) this.player.weapon.critChance = 0;
                    this.player.weapon.critChance = Math.min(0.4, this.player.weapon.critChance + 0.05);
                }
            },
            boss_damage: {
                id: 'boss_damage',
                name: 'Giant Killer',
                description: 'Deal 25% more damage to bosses (Requires Level 12)',
                type: 'passive',
                maxStacks: 4,
                currentStacks: 0,
                requires: () => this.player.level >= 12,
                apply: () => {
                    if (!this.player.bossDamageBonus) this.player.bossDamageBonus = 0;
                    this.player.bossDamageBonus += 0.25;
                }
            },
        };

        this.availableSkills = [];
        this.gamePaused = false;
        this.explosions = [];
        this.bullets = [];
        this.camera = {
            x: this.player.x,
            y: this.player.y,
            speed: 5
        };

        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 2.5; // Slower initial spawn rate
        this.enemiesPerSpawn = 1; // Start with fewer enemies
        this.maxEnemies = 50;
        this.survivalTime = 0;
        this.showDebug = false;
        this.bossSpawnTimer = 60; // First boss at 1 minute
        this.bossCount = 0;

        this.setupControls();
        const weaponText = document.getElementById('weapon-text');
        if (weaponText) weaponText.textContent = 'Weapon: Pistol';
        this.resize();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame((time) => this.loop(time));
    }

    // --- NEW COLLISION AND MOVEMENT LOGIC ---

    /**
     * Checks for overlap between two AABB entities.
     * @param {object} entityA - The first entity (e.g., player, enemy, bullet).
     * @param {object} entityB - The second entity.
     * @returns {boolean} - True if they are colliding.
     */
    checkAABBCollision(entityA, entityB) {
        const boxA = entityA.boundingBox;
        const boxB = entityB.boundingBox;

        // Check for overlap on the X and Y axes
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

    /**
     * Checks if a specific tile type is passable.
     * @param {string} tileType - The type of tile (e.g., 'grass', 'water').
     * @returns {boolean} - True if the tile is solid.
     */
    isTileSolid(tileType) {
        return tileType === 'water' || tileType === 'rock';
    }

    /**
     * Checks if a given position is passable for an entity with a bounding box.
     * @param {number} x - The future X position in world coordinates.
     * @param {number} y - The future Y position in world coordinates.
     * @param {object} boundingBox - The entity's bounding box.
     * @returns {boolean} - False if the position is blocked.
     */
    isPassable(x, y, boundingBox) {
        // Get the four corners of the bounding box
        const halfWidth = boundingBox.width / 2;
        const halfHeight = boundingBox.height / 2;
        const corners = [
            { x: x - halfWidth, y: y - halfHeight }, // Top-left
            { x: x + halfWidth, y: y - halfHeight }, // Top-right
            { x: x - halfWidth, y: y + halfHeight }, // Bottom-left
            { x: x + halfWidth, y: y + halfHeight }, // Bottom-right
        ];

        // Check if any corner is on a solid tile
        for (const corner of corners) {
            const tile = this.getTileAt(Math.round(corner.x), Math.round(corner.y));
            if (this.isTileSolid(tile.type)) {
                return false; // Blocked
            }
        }
        return true; // Not blocked
    }


    // --- CORE GAME LOGIC (UNCHANGED SECTIONS OMITTED FOR BREVITY) ---

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        this.tileSize = minDimension / 10; // Changed from 20 to 10 for 2x zoom
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
        this.player.experienceToNextLevel = Math.floor(this.player.experienceToNextLevel * 1.2); // Changed from 1.2 to 1.5
        document.getElementById('level-text').textContent = `Level ${this.player.level}`;
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
            skillOption.style = `
                background-color: rgba(52, 152, 219, 0.3);
                border: 2px solid ${borderColor};
                border-radius: 5px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            let stackInfo = '';
            if (skill.maxStacks) {
                stackInfo = ` (${skill.currentStacks}/${skill.maxStacks})`;
            }
            skillOption.innerHTML = `
                <h3>${skill.name}${stackInfo}</h3>
                <p>${skill.description}</p>
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
        this.showNotification(`New skill acquired: ${skill.name}`);
        this.gamePaused = false;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style = `
            position: absolute;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 100;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
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
            // Explosion uses a simpler distance check, which is fine for circular blasts
            const dx = (enemy.x - x);
            const dy = (enemy.y - y);
            const distance = Math.sqrt(dx * dx + dy * dy) * this.tileSize; // convert to pixels for radius check
            if (distance < explosion.maxRadius) {
                const damageMultiplier = 1 - (distance / explosion.maxRadius);
                enemy.health -= this.player.weapon.damage * damageMultiplier;
            }
        }
    }

    fireBullet() {
        const aimDir = this.player.weapon.aimDirection;
        const gunOffset = this.tileSize * 0.4 / this.tileSize; // Offset in world units
        const baseX = this.player.x + aimDir.x * gunOffset;
        const baseY = this.player.y + aimDir.y * gunOffset;

        const createBullet = (direction, damageMultiplier = 1) => ({
            x: baseX,
            y: baseY,
            speed: this.player.weapon.bulletSpeed,
            direction,
            damage: this.player.weapon.damage * damageMultiplier,
            lifeTime: 2.0,
            explosive: this.player.weapon.explosive,
            piercing: this.player.weapon.piercing,
            // Bullets need a small bounding box for collision
            boundingBox: { width: 0.2, height: 0.2 }
        });

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
                for (let i = 0; i < 4; i++) {
                    const angle = baseAngle + i * (Math.PI / 2);
                    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
                    this.bullets.push(createBullet(direction, 0.8));
                }
                break;
            }
            case 'shotgun': {
                const spreadCount = 7;
                const spreadAngle = Math.PI / 4;
                for (let i = 0; i < spreadCount; i++) {
                    const angle = Math.atan2(aimDir.y, aimDir.x) + (i - (spreadCount - 1) / 2) * (spreadAngle / (spreadCount - 1));
                    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
                    const bullet = createBullet(direction, 0.7); // Increased from 0.5
                    bullet.lifeTime = 1.0;
                    this.bullets.push(bullet);
                }
                break;
            }
            default: { // normal
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
        if (this.enemies.length >= this.maxEnemies) return;
        const groupSize = Math.min(
            Math.floor(Math.random() * 2) + Math.floor(this.enemiesPerSpawn), // Reduced random range
            this.maxEnemies - this.enemies.length
        );
        const baseAngle = Math.random() * Math.PI * 2;
        const minDistance = 5; // Reduced from 6
        const maxDistance = 8; // Reduced from 10
        for (let i = 0; i < groupSize; i++) {
            const angleVariation = (Math.random() - 0.5) * Math.PI / 4;
            const angle = baseAngle + angleVariation;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;

            // Ensure enemies don't spawn in solid tiles
            const spawnTile = this.getTileAt(Math.round(x), Math.round(y));
            if (this.isTileSolid(spawnTile.type)) continue;

            const baseZombieSpeed = this.player.speed * this.enemySpeedRatio;
            const speedVariation = 0.3;
            const zombieType = Math.random();
            
            // Scale enemy stats based on survival time
            const difficultyMultiplier = 1 + (this.survivalTime / 120); // +100% every 2 minutes
            
            let zombieStats = {};
            if (zombieType < 0.7) {
                zombieStats = { 
                    health: Math.floor(50 * difficultyMultiplier), 
                    speed: baseZombieSpeed * (1 - speedVariation / 2 + Math.random() * speedVariation), 
                    damage: 15, 
                    color: '#4a5d4a', 
                    size: 1.0 
                };
            } else if (zombieType < 0.95) {
                zombieStats = { 
                    health: Math.floor(30 * difficultyMultiplier), 
                    speed: baseZombieSpeed * 1.8, 
                    damage: 10, 
                    color: '#7a4a4a', 
                    size: 0.8 
                };
            } else {
                zombieStats = { 
                    health: Math.floor(150 * difficultyMultiplier), 
                    speed: baseZombieSpeed * 0.5, 
                    damage: 25, 
                    color: '#3a3a5a', 
                    size: 1.3 
                };
            }

            this.enemies.push({
                x,
                y,
                width: this.tileSize * 0.8 * zombieStats.size,
                height: this.tileSize * 0.8 * zombieStats.size,
                // NEW: Enemy bounding box
                boundingBox: {
                    width: 0.7 * zombieStats.size,
                    height: 0.7 * zombieStats.size
                },
                health: zombieStats.health,
                maxHealth: zombieStats.health,
                speed: zombieStats.speed,
                damage: zombieStats.damage,
                speedVariation: speedVariation,
                color: zombieStats.color,
                size: zombieStats.size,
                facing: 0
            });
        }
    }
    
    spawnBoss() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 8;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        // Ensure boss doesn't spawn in solid tiles
        const spawnTile = this.getTileAt(Math.round(x), Math.round(y));
        if (this.isTileSolid(spawnTile.type)) {
            // Try again next frame
            this.bossSpawnTimer = this.survivalTime + 0.1;
            return;
        }
        
        const bossMultiplier = 1 + this.bossCount * 0.5;
        const boss = {
            x,
            y,
            width: this.tileSize * 2,
            height: this.tileSize * 2,
            boundingBox: {
                width: 1.8,
                height: 1.8
            },
            health: Math.floor(500 * bossMultiplier),
            maxHealth: Math.floor(500 * bossMultiplier),
            speed: this.player.speed * 0.3,
            damage: 40,
            speedVariation: 0,
            color: '#8b0000',
            size: 2.5,
            facing: 0,
            isBoss: true
        };
        
        this.enemies.push(boss);
        this.showNotification('BOSS SPAWNED!');
    }

    // --- REWRITTEN UPDATE METHOD ---
    update(dt) {
        if (this.gamePaused) return;
        this.survivalTime += dt;

        // --- Player Movement with new collision ---
        const moveX = this.player.direction.x * this.player.speed * dt;
        const moveY = this.player.direction.y * this.player.speed * dt;

        // Move on X axis
        if (this.isPassable(this.player.x + moveX, this.player.y, this.player.boundingBox)) {
            this.player.x += moveX;
        }
        // Move on Y axis
        if (this.isPassable(this.player.x, this.player.y + moveY, this.player.boundingBox)) {
            this.player.y += moveY;
        }

        // --- Player facing direction (no changes) ---
        if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
            this.player.facingAngle = Math.atan2(-moveY, moveX);
        }

        // --- Player state updates (regen, weapon angle, firing) ---
        if (this.player.healthRegen) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.healthRegen * dt);
            document.getElementById('health-value').style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        }
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

        // --- Bullet Update & Collision ---
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
                // Use new AABB collision check
                if (this.checkAABBCollision(bullet, enemy)) {
                    let damage = bullet.damage;
                    
                    // Apply critical hit
                    if (this.player.weapon.critChance && Math.random() < this.player.weapon.critChance) {
                        damage *= 2;
                        // Could add visual effect for critical hits
                    }
                    
                    // Apply boss damage bonus
                    if (enemy.isBoss && this.player.bossDamageBonus) {
                        damage *= (1 + this.player.bossDamageBonus);
                    }
                    
                    enemy.health -= damage;
                    
                    // Apply knockback if enabled
                    if (this.player.weapon.knockback) {
                        const knockbackForce = enemy.isBoss ? 0.1 : 0.3; // Less knockback on bosses
                        enemy.x += bullet.direction.x * knockbackForce;
                        enemy.y += bullet.direction.y * knockbackForce;
                    }
                    
                    if (bullet.explosive) {
                        this.createExplosion(bullet.x, bullet.y);
                    }
                    if (!bullet.piercing) {
                        this.bullets.splice(i, 1);
                        break; // Bullet is destroyed, no need to check other enemies
                    }
                }
            }
        }

        // --- Enemy Update & Collision ---
        let enemiesToRemove = new Set();
        for (const enemy of this.enemies) {
            if (enemy.health <= 0) {
                this.player.score += 10;
                
                // Different rewards for bosses
                if (enemy.isBoss) {
                    this.gainExperience(500);
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 20);
                    document.getElementById('health-value').style.width =
                        `${(this.player.health / this.player.maxHealth) * 100}%`;
                    this.showNotification('Boss defeated! +20 HP');
                } else {
                    this.gainExperience(5 + Math.floor((enemy.maxHealth || 0) / 30));
                }
                
                // Life steal mechanic
                if (this.player.lifeSteal) {
                    if (!this.player.killCount) this.player.killCount = 0;
                    this.player.killCount++;
                    if (this.player.killCount >= 10) {
                        this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.lifeSteal);
                        this.player.killCount -= 10;
                        document.getElementById('health-value').style.width =
                            `${(this.player.health / this.player.maxHealth) * 100}%`;
                    }
                }
                
                enemiesToRemove.add(enemy);
                continue; // Skip the rest for this dead enemy
            }

            // --- Player-Enemy Collision ---
            if (this.checkAABBCollision(this.player, enemy)) {
                // Check dodge chance
                if (this.player.dodgeChance && Math.random() < this.player.dodgeChance) {
                    // Dodged! Maybe show a visual effect later
                    continue;
                }
                
                let damageTaken = enemy.damage * dt;
                if (this.player.damageResistance) {
                    damageTaken *= (1 - this.player.damageResistance);
                }
                this.player.health -= damageTaken;
                if (this.player.health <= 0) {
                    const minutes = Math.floor(this.survivalTime / 60);
                    const seconds = Math.floor(this.survivalTime % 60);
                    alert(`Game Over!\n\nSurvival Time: ${minutes}:${seconds.toString().padStart(2, '0')}\nZombies Killed: ${this.player.score / 10}\nLevel Reached: ${this.player.level}`);
                    window.location.reload();
                }
            }

            // --- Enemy Movement ---
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0.1) { // Stop moving when very close
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
        // Remove all marked enemies
        if (enemiesToRemove.size > 0) {
            this.enemies = this.enemies.filter(e => !enemiesToRemove.has(e));
            document.getElementById('score').textContent = `Score: ${this.player.score}`;
        }


        // --- Explosion update ---
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.lifeTime -= dt;
            explosion.radius = explosion.maxRadius * (1 - explosion.lifeTime / explosion.maxLifeTime);
            if (explosion.lifeTime <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // --- Spawner ---
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            if (this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
            }
            this.enemySpawnTimer = 0;
            this.enemySpawnRate = Math.max(0.3, this.enemySpawnRate - 0.01); // Slower decrease
            if (this.enemiesPerSpawn < 8) { // Higher max spawn count
                this.enemiesPerSpawn += 0.03; // Faster increase
            }
        }
        
        // --- Boss Spawner ---
        if (this.survivalTime >= this.bossSpawnTimer) {
            this.spawnBoss();
            this.bossCount++;
            // Next boss spawns faster and is stronger
            this.bossSpawnTimer = this.survivalTime + Math.max(30, 60 - this.bossCount * 5);
        }
    }


    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.camera.x += (this.player.x - this.camera.x) / this.camera.speed;
        this.camera.y += (this.player.y - this.camera.y) / this.camera.speed;
        const margin = 3; // Reduced from 5 since tiles are bigger
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
                
                // Add a ring around bosses
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
    }
    drawEnemy(x, y, enemy) {
        // Add boss glow effect
        if (enemy.isBoss) {
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 20;
        }
        
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.tileSize / 3 * enemy.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = enemy.isBoss ? '#ffff00' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = enemy.isBoss ? 3 : 2;
        this.ctx.stroke();
        
        // Reset shadow
        if (enemy.isBoss) {
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.fillStyle = '#ff0000';
        const eyeOffset = this.tileSize / 8 * enemy.size;
        const eyeSize = this.tileSize / 20 * enemy.size;
        this.ctx.beginPath();
        this.ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();
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

// Initialize the game when the window loads
window.addEventListener('load', () => {
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
