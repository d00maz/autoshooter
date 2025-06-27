// Enemy System for the isometric game

const ENEMY_HOOKS = {
    ON_SPAWN: 'onSpawn',
    ON_UPDATE: 'onUpdate',
    ON_DEATH: 'onDeath',
    ON_HIT: 'onHit',
    ON_PLAYER_COLLISION: 'onPlayerCollision',
    MODIFY_DAMAGE: 'modifyDamage',
    MODIFY_SPEED: 'modifySpeed',
    CUSTOM_RENDER: 'customRender'
};

function createEnemies(game) {
    return {
        // Basic zombie - most common enemy
        basic_zombie: {
            id: 'basic_zombie',
            name: 'Zombie',
            weight: 70, // 70% spawn chance
            baseStats: {
                health: 50,
                damage: 20,
                speedMultiplier: 1.0,
                size: 1.0,
                color: '#4a5d4a',
                experience: 10,
                speedVariation: 0.3
            },
            createEnemy: function(x, y, difficultyMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * difficultyMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 0.8 * stats.size,
                    height: game.tileSize * 0.8 * stats.size,
                    boundingBox: {
                        width: 0.7 * stats.size,
                        height: 0.7 * stats.size
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * (1 - stats.speedVariation / 2 + Math.random() * stats.speedVariation),
                    damage: stats.damage,
                    speedVariation: stats.speedVariation,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    hitFlash: 0,
                    experience: stats.experience + Math.floor(health / 20)
                };
            }
        },
        
        // Fast zombie - glass cannon
        fast_zombie: {
            id: 'fast_zombie',
            name: 'Runner',
            weight: 25, // 25% spawn chance
            baseStats: {
                health: 30,
                damage: 15,
                speedMultiplier: 1.8,
                size: 0.8,
                color: '#7a4a4a',
                experience: 15,
                speedVariation: 0.2
            },
            createEnemy: function(x, y, difficultyMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * difficultyMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 0.8 * stats.size,
                    height: game.tileSize * 0.8 * stats.size,
                    boundingBox: {
                        width: 0.7 * stats.size,
                        height: 0.7 * stats.size
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: stats.speedVariation,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    hitFlash: 0,
                    experience: stats.experience + Math.floor(health / 20)
                };
            }
        },
        
        // Tank zombie - slow but tough
        tank_zombie: {
            id: 'tank_zombie',
            name: 'Brute',
            weight: 5, // 5% spawn chance
            baseStats: {
                health: 150,
                damage: 35,
                speedMultiplier: 0.5,
                size: 1.3,
                color: '#3a3a5a',
                experience: 30,
                speedVariation: 0.1
            },
            createEnemy: function(x, y, difficultyMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * difficultyMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 0.8 * stats.size,
                    height: game.tileSize * 0.8 * stats.size,
                    boundingBox: {
                        width: 0.7 * stats.size,
                        height: 0.7 * stats.size
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: stats.speedVariation,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    hitFlash: 0,
                    experience: stats.experience + Math.floor(health / 20)
                };
            }
        },
        
        // NEW: Exploder zombie - explodes on death even without mutation
        exploder_zombie: {
            id: 'exploder_zombie',
            name: 'Exploder',
            weight: 0, // Special spawn only
            baseStats: {
                health: 40,
                damage: 25,
                speedMultiplier: 1.2,
                size: 0.9,
                color: '#ff6600',
                experience: 20,
                speedVariation: 0.2
            },
            createEnemy: function(x, y, difficultyMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * difficultyMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 0.8 * stats.size,
                    height: game.tileSize * 0.8 * stats.size,
                    boundingBox: {
                        width: 0.7 * stats.size,
                        height: 0.7 * stats.size
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: stats.speedVariation,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    hitFlash: 0,
                    experience: stats.experience + Math.floor(health / 20),
                    glowPulse: 0
                };
            },
            onUpdate: function(enemy, dt) {
                // Pulsing glow effect
                enemy.glowPulse = (enemy.glowPulse || 0) + dt * 3;
            },
            onDeath: function(enemy) {
                // Always explode
                const explosion = {
                    x: enemy.x,
                    y: enemy.y,
                    radius: 0,
                    maxRadius: game.tileSize * 2,
                    lifeTime: 0.3,
                    maxLifeTime: 0.3,
                    color: '#ff6600'
                };
                game.explosions.push(explosion);
                
                // Deal damage to nearby enemies and player
                const targets = [...game.enemies, game.player];
                for (const target of targets) {
                    if (target === enemy) continue;
                    const dx = (target.x - enemy.x);
                    const dy = (target.y - enemy.y);
                    const distance = Math.sqrt(dx * dx + dy * dy) * game.tileSize;
                    if (distance < explosion.maxRadius) {
                        const damageMultiplier = 1 - (distance / explosion.maxRadius);
                        const damage = enemy.damage * 1.5 * damageMultiplier;
                        
                        if (target === game.player) {
                            game.player.health -= damage;
                            document.getElementById('health-value').style.width = 
                                `${(game.player.health / game.player.maxHealth) * 100}%`;
                                
                            if (game.player.health <= 0) {
                                const minutes = Math.floor(game.survivalTime / 60);
                                const seconds = Math.floor(game.survivalTime % 60);
                                alert(`Game Over!\n\nSurvival Time: ${minutes}:${seconds.toString().padStart(2, '0')}\nZombies Killed: ${game.player.score / 10}\nLevel Reached: ${game.player.level}`);
                                window.location.reload();
                            }
                        } else {
                            target.health -= damage;
                        }
                    }
                }
            },
            customRender: function(ctx, x, y, enemy) {
                // Draw with pulsing glow
                const pulseAmount = Math.sin(enemy.glowPulse || 0) * 0.3 + 0.7;
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 15 * pulseAmount;
                
                // Draw warning symbol
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('!', x, y - game.tileSize / 2 * enemy.size - 20);
                ctx.textAlign = 'left';
            }
        },
        
        // NEW: Vampire zombie - heals nearby zombies
        vampire_zombie: {
            id: 'vampire_zombie',
            name: 'Vampire',
            weight: 0, // Special spawn only
            baseStats: {
                health: 60,
                damage: 25,
                speedMultiplier: 1.1,
                size: 1.0,
                color: '#8b008b',
                experience: 40,
                speedVariation: 0.2
            },
            createEnemy: function(x, y, difficultyMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * difficultyMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 0.8 * stats.size,
                    height: game.tileSize * 0.8 * stats.size,
                    boundingBox: {
                        width: 0.7 * stats.size,
                        height: 0.7 * stats.size
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: stats.speedVariation,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    hitFlash: 0,
                    experience: stats.experience + Math.floor(health / 20),
                    healTimer: 0
                };
            },
            onUpdate: function(enemy, dt) {
                enemy.healTimer += dt;
                
                // Heal nearby enemies every 2 seconds
                if (enemy.healTimer >= 2) {
                    enemy.healTimer = 0;
                    
                    for (const other of game.enemies) {
                        if (other === enemy || other.health <= 0) continue;
                        
                        const dx = other.x - enemy.x;
                        const dy = other.y - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist <= 3) { // 3 tile radius
                            const healAmount = 10;
                            other.health = Math.min(other.maxHealth, other.health + healAmount);
                            
                            // Visual heal effect
                            game.createHitEffect(other.x, other.y, false);
                        }
                    }
                }
            },
            customRender: function(ctx, x, y, enemy) {
                // Draw healing aura
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(x, y, game.tileSize * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        },
        
        // BOSSES
        basic_boss: {
            id: 'basic_boss',
            name: 'Boss Zombie',
            weight: 0, // Bosses don't use weight
            isBoss: true,
            baseStats: {
                health: 800,
                damage: 50,
                speedMultiplier: 0.3,
                size: 2.5,
                color: '#8b0000',
                experience: 1000,
                speedVariation: 0
            },
            createEnemy: function(x, y, bossMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * bossMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 2,
                    height: game.tileSize * 2,
                    boundingBox: {
                        width: 1.8,
                        height: 1.8
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: 0,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    isBoss: true,
                    hitFlash: 0,
                    experience: stats.experience
                };
            },
            onDeath: function(enemy) {
                // Boss death rewards
                game.player.health = Math.min(game.player.maxHealth, game.player.health + 50);
                document.getElementById('health-value').style.width =
                    `${(game.player.health / game.player.maxHealth) * 100}%`;
                game.showNotification('Boss defeated! +50 HP', 4000);
                
                // Boss kill triggers a mutation!
                game.triggerMutation();
            }
        },
        
        // NEW: Shielded Boss - has a shield that must be broken first
        shielded_boss: {
            id: 'shielded_boss',
            name: 'Shielded Boss',
            weight: 0,
            isBoss: true,
            baseStats: {
                health: 600,
                shieldHealth: 400,
                damage: 60,
                speedMultiplier: 0.25,
                size: 2.5,
                color: '#4169e1',
                shieldColor: '#00ffff',
                experience: 1500,
                speedVariation: 0
            },
            createEnemy: function(x, y, bossMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * bossMultiplier);
                let shieldHealth = Math.floor(stats.shieldHealth * bossMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                    shieldHealth *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 2,
                    height: game.tileSize * 2,
                    boundingBox: {
                        width: 1.8,
                        height: 1.8
                    },
                    health: health,
                    maxHealth: health,
                    shield: shieldHealth,
                    maxShield: shieldHealth,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: 0,
                    color: stats.color,
                    shieldColor: stats.shieldColor,
                    size: stats.size,
                    facing: 0,
                    isBoss: true,
                    hitFlash: 0,
                    experience: stats.experience,
                    shieldPulse: 0
                };
            },
            onHit: function(enemy, damage) {
                // Damage hits shield first
                if (enemy.shield > 0) {
                    enemy.shield -= damage;
                    if (enemy.shield <= 0) {
                        enemy.shield = 0;
                        game.showNotification('Shield broken!', 2000);
                    }
                    return 0; // No health damage while shielded
                }
                return damage; // Normal damage when shield is down
            },
            onUpdate: function(enemy, dt) {
                enemy.shieldPulse = (enemy.shieldPulse || 0) + dt * 2;
            },
            customRender: function(ctx, x, y, enemy) {
                // Draw shield if active
                if (enemy.shield > 0) {
                    const shieldAlpha = 0.3 + Math.sin(enemy.shieldPulse) * 0.1;
                    ctx.globalAlpha = shieldAlpha;
                    ctx.strokeStyle = enemy.shieldColor;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, game.tileSize / 3 * enemy.size + 10, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                    
                    // Shield health bar
                    const shieldPercent = enemy.shield / enemy.maxShield;
                    const barWidth = game.tileSize * 0.8 * enemy.size;
                    const barHeight = 4;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(x - barWidth / 2, y - game.tileSize / 2 * enemy.size - 20, barWidth, barHeight);
                    ctx.fillStyle = enemy.shieldColor;
                    ctx.fillRect(x - barWidth / 2, y - game.tileSize / 2 * enemy.size - 20, barWidth * shieldPercent, barHeight);
                }
            },
            onDeath: function(enemy) {
                // Boss death rewards
                game.player.health = Math.min(game.player.maxHealth, game.player.health + 50);
                document.getElementById('health-value').style.width =
                    `${(game.player.health / game.player.maxHealth) * 100}%`;
                game.showNotification('Shielded Boss defeated! +50 HP', 4000);
                
                // Boss kill triggers a mutation!
                game.triggerMutation();
            }
        },
        
        // NEW: Summoner Boss - spawns minions
        summoner_boss: {
            id: 'summoner_boss',
            name: 'Summoner Boss',
            weight: 0,
            isBoss: true,
            baseStats: {
                health: 700,
                damage: 40,
                speedMultiplier: 0.35,
                size: 2.5,
                color: '#9400d3',
                experience: 1200,
                speedVariation: 0
            },
            createEnemy: function(x, y, bossMultiplier) {
                const stats = this.baseStats;
                const baseSpeed = game.player.speed * game.enemySpeedRatio;
                
                let health = Math.floor(stats.health * bossMultiplier);
                
                // Apply Thick Hide mutation
                if (game.mutations.some(m => m.id === 'thick_hide')) {
                    health *= 1.5;
                }
                
                return {
                    x,
                    y,
                    type: this.id,
                    width: game.tileSize * 2,
                    height: game.tileSize * 2,
                    boundingBox: {
                        width: 1.8,
                        height: 1.8
                    },
                    health: health,
                    maxHealth: health,
                    speed: baseSpeed * stats.speedMultiplier,
                    damage: stats.damage,
                    speedVariation: 0,
                    color: stats.color,
                    size: stats.size,
                    facing: 0,
                    isBoss: true,
                    hitFlash: 0,
                    experience: stats.experience,
                    summonTimer: 5,
                    summonCircle: 0
                };
            },
            onUpdate: function(enemy, dt) {
                enemy.summonTimer -= dt;
                enemy.summonCircle = (enemy.summonCircle || 0) + dt * 2;
                
                // Summon minions every 5 seconds
                if (enemy.summonTimer <= 0 && game.enemies.length < game.maxEnemies - 3) {
                    enemy.summonTimer = 5;
                    
                    // Spawn 3 fast zombies around the boss
                    for (let i = 0; i < 3; i++) {
                        const angle = (Math.PI * 2 * i) / 3 + enemy.summonCircle;
                        const spawnX = enemy.x + Math.cos(angle) * 2;
                        const spawnY = enemy.y + Math.sin(angle) * 2;
                        
                        const enemyManager = game.enemyManager;
                        const fastZombie = enemyManager.createEnemyByType('fast_zombie', spawnX, spawnY);
                        if (fastZombie) {
                            game.enemies.push(fastZombie);
                            
                            // Visual spawn effect
                            game.createHitEffect(spawnX, spawnY, false);
                        }
                    }
                    
                    game.showNotification('Boss summoned minions!', 2000);
                }
            },
            customRender: function(ctx, x, y, enemy) {
                // Draw summoning circle
                if (enemy.summonTimer < 1) {
                    ctx.globalAlpha = 1 - enemy.summonTimer;
                    ctx.strokeStyle = '#ff00ff';
                    ctx.lineWidth = 3;
                    
                    // Draw pentagram
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2 + enemy.summonCircle;
                        const px = x + Math.cos(angle) * game.tileSize * 2;
                        const py = y + Math.sin(angle) * game.tileSize * 2;
                        if (i === 0) {
                            ctx.moveTo(px, py);
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            },
            onDeath: function(enemy) {
                // Boss death rewards
                game.player.health = Math.min(game.player.maxHealth, game.player.health + 50);
                document.getElementById('health-value').style.width =
                    `${(game.player.health / game.player.maxHealth) * 100}%`;
                game.showNotification('Summoner Boss defeated! +50 HP', 4000);
                
                // Boss kill triggers a mutation!
                game.triggerMutation();
            }
        }
    };
}

// Enemy Manager - handles all enemy logic
class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemyTypes = createEnemies(game);
        
        // Calculate spawn weights
        this.normalEnemies = [];
        this.totalWeight = 0;
        
        for (const typeId in this.enemyTypes) {
            const enemyType = this.enemyTypes[typeId];
            if (enemyType.weight > 0 && !enemyType.isBoss) {
                this.normalEnemies.push(enemyType);
                this.totalWeight += enemyType.weight;
            }
        }
        
        // Boss types
        this.bossTypes = Object.values(this.enemyTypes).filter(e => e.isBoss);
    }
    
    // Get a random enemy type based on weights
    getRandomEnemyType() {
        const rand = Math.random() * this.totalWeight;
        let accumulator = 0;
        
        for (const enemyType of this.normalEnemies) {
            accumulator += enemyType.weight;
            if (rand <= accumulator) {
                return enemyType;
            }
        }
        
        return this.normalEnemies[0]; // Fallback
    }
    
    // Get a random boss type
    getRandomBossType() {
        return this.bossTypes[Math.floor(Math.random() * this.bossTypes.length)];
    }
    
    // Create an enemy instance
    createEnemy(x, y, difficultyMultiplier) {
        const enemyType = this.getRandomEnemyType();
        const enemy = enemyType.createEnemy(x, y, difficultyMultiplier);
        
        // Apply global speed modifier from mutations
        if (this.game.mutations.some(m => m.id === 'speed_demon')) {
            enemy.speed *= 1.3;
        }
        
        return enemy;
    }
    
    // Create a specific enemy type (for special spawns)
    createEnemyByType(typeId, x, y) {
        const enemyType = this.enemyTypes[typeId];
        if (!enemyType) return null;
        
        const difficultyMultiplier = 1 + (this.game.survivalTime / 120);
        const enemy = enemyType.createEnemy(x, y, difficultyMultiplier);
        
        // Apply global speed modifier from mutations
        if (this.game.mutations.some(m => m.id === 'speed_demon')) {
            enemy.speed *= 1.3;
        }
        
        return enemy;
    }
    
    // Create a boss
    createBoss(x, y, bossMultiplier) {
        const bossType = this.getRandomBossType();
        const boss = bossType.createEnemy(x, y, bossMultiplier);
        
        // Apply global speed modifier from mutations
        if (this.game.mutations.some(m => m.id === 'speed_demon')) {
            boss.speed *= 1.3;
        }
        
        return boss;
    }
    
    // Process on-hit effects
    onHit(enemy, damage, bullet) {
        const enemyType = this.enemyTypes[enemy.type];
        if (enemyType && enemyType.onHit) {
            return enemyType.onHit(enemy, damage, bullet);
        }
        return damage;
    }
    
    // Process on-death effects
    onDeath(enemy) {
        const enemyType = this.enemyTypes[enemy.type];
        
        // Handle volatile mutation
        if (this.game.mutations.some(m => m.id === 'volatile') && !enemy.type.includes('exploder')) {
            // Create explosion
            const explosion = {
                x: enemy.x,
                y: enemy.y,
                radius: 0,
                maxRadius: this.game.tileSize * 1.5,
                lifeTime: 0.3,
                maxLifeTime: 0.3,
                color: '#ff00ff'
            };
            this.game.explosions.push(explosion);
            
            // Deal damage to nearby enemies and player
            const targets = [...this.game.enemies, this.game.player];
            for (const target of targets) {
                if (target === enemy) continue;
                const dx = (target.x - enemy.x);
                const dy = (target.y - enemy.y);
                const distance = Math.sqrt(dx * dx + dy * dy) * this.game.tileSize;
                if (distance < explosion.maxRadius) {
                    const damageMultiplier = 1 - (distance / explosion.maxRadius);
                    const damage = enemy.damage * damageMultiplier;
                    
                    if (target === this.game.player) {
                        this.game.player.health -= damage;
                        document.getElementById('health-value').style.width = 
                            `${(this.game.player.health / this.game.player.maxHealth) * 100}%`;
                            
                        if (this.game.player.health <= 0) {
                            const minutes = Math.floor(this.game.survivalTime / 60);
                            const seconds = Math.floor(this.game.survivalTime % 60);
                            alert(`Game Over!\n\nSurvival Time: ${minutes}:${seconds.toString().padStart(2, '0')}\nZombies Killed: ${this.game.player.score / 10}\nLevel Reached: ${this.game.player.level}`);
                            window.location.reload();
                        }
                    } else {
                        target.health -= damage;
                    }
                }
            }
        }
        
        // Call enemy-specific on-death effects
        if (enemyType && enemyType.onDeath) {
            enemyType.onDeath(enemy);
        }
    }
    
    // Process on-update effects
    onUpdate(enemy, dt) {
        const enemyType = this.enemyTypes[enemy.type];
        if (enemyType && enemyType.onUpdate) {
            enemyType.onUpdate(enemy, dt);
        }
    }
    
    // Process on-player-collision effects
    onPlayerCollision(enemy, damage) {
        const enemyType = this.enemyTypes[enemy.type];
        
        // Apply Blood Frenzy mutation
        if (this.game.mutations.some(m => m.id === 'blood_frenzy')) {
            damage *= 1.3;
        }
        
        if (enemyType && enemyType.onPlayerCollision) {
            return enemyType.onPlayerCollision(enemy, damage);
        }
        return damage;
    }
    
    // Custom render for special enemies
    customRender(ctx, x, y, enemy) {
        const enemyType = this.enemyTypes[enemy.type];
        if (enemyType && enemyType.customRender) {
            enemyType.customRender(ctx, x, y, enemy);
        }
    }
    
    // Get experience value for an enemy
    getExperience(enemy) {
        return enemy.experience || 10;
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createEnemies, EnemyManager };
}

// For browser usage
if (typeof window !== 'undefined') {
    window.createEnemies = createEnemies;
    window.EnemyManager = EnemyManager;
}
