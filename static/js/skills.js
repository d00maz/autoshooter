// Skills System for the isometric game

const SKILL_HOOKS = {
    ON_HIT: 'onHit',
    ON_KILL: 'onKill',
    ON_DAMAGE_TAKEN: 'onDamageTaken',
    ON_UPDATE: 'onUpdate',
    ON_BULLET_FIRE: 'onBulletFire',
    ON_LEVEL_UP: 'onLevelUp',
    ON_ENEMY_SPAWN: 'onEnemySpawn',
    MODIFY_DAMAGE: 'modifyDamage',
    MODIFY_DAMAGE_TAKEN: 'modifyDamageTaken',
    CAN_DODGE: 'canDodge',
};

function createSkills(game) {
    const addBuff = (buffId, duration, effect, onExpire) => {
        if (!game.player.buffs) game.player.buffs = {};
        game.player.buffs[buffId] = {
            duration: duration,
            maxDuration: duration,
            effect: effect,
            onExpire: onExpire
        };
    };

    const hasBuff = (buffId) => {
        return game.player.buffs && game.player.buffs[buffId];
    };

    return {
        health_boost: {
            id: 'health_boost',
            name: 'First Aid Kit',
            description: 'Find medical supplies (+20 health, +40 on final rank)',
            type: 'passive',
            maxStacks: 20,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const healthGain = isLastRank ? 40 : 20;
                game.player.maxHealth += healthGain;
                game.player.health += healthGain;
                document.getElementById('health-value').style.width =
                    `${(game.player.health / game.player.maxHealth) * 100}%`;
            }
        },
        speed_boost: {
            id: 'speed_boost',
            name: 'Adrenaline Rush',
            description: 'Move 8% faster (15% on final rank)',
            type: 'passive',
            maxStacks: 10,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const speedMultiplier = isLastRank ? 1.15 : 1.08;
                game.player.speed *= speedMultiplier;
                game.updateEnemySpeeds();
            }
        },
        health_regen: {
            id: 'health_regen',
            name: 'Survival Instinct',
            description: 'Heal over time (+1 HP/sec, +3 on final rank)',
            type: 'passive',
            maxStacks: 8,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                this.regenAmount = isLastRank ? 3 : 1;
                if (!game.player.healthRegen) game.player.healthRegen = 0;
                game.player.healthRegen += this.regenAmount;
            },
            onUpdate: function(dt) {
                if (game.player.healthRegen && game.player.health < game.player.maxHealth) {
                    game.player.health = Math.min(game.player.maxHealth, 
                        game.player.health + game.player.healthRegen * dt);
                    document.getElementById('health-value').style.width = 
                        `${(game.player.health / game.player.maxHealth) * 100}%`;
                }
            }
        },
        damage_resistance: {
            id: 'damage_resistance',
            name: 'Reinforced Armor',
            description: 'Take 5% less damage (10% on final rank, max 60%)',
            type: 'passive',
            maxStacks: 10,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const resistAmount = isLastRank ? 0.10 : 0.05;
                if (!game.player.damageResistance) game.player.damageResistance = 0;
                game.player.damageResistance = Math.min(0.6, game.player.damageResistance + resistAmount);
            },
            modifyDamageTaken: function(damage) {
                if (game.player.damageResistance) {
                    return damage * (1 - game.player.damageResistance);
                }
                return damage;
            }
        },
        damage_up: {
            id: 'damage_up',
            name: 'Hollow Points',
            description: 'More stopping power (+5 damage, +15 on final rank)',
            type: 'weapon_upgrade',
            maxStacks: 25,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const damageBonus = isLastRank ? 15 : 5;
                game.player.weapon.damage += damageBonus;
            }
        },
        fire_rate_up: {
            id: 'fire_rate_up',
            name: 'Hair Trigger',
            description: 'Shoot 10% faster (25% on final rank)',
            type: 'weapon_upgrade',
            maxStacks: 12,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const fireRateMultiplier = isLastRank ? 0.75 : 0.90;
                game.player.weapon.fireRate *= fireRateMultiplier;
            }
        },
        bullet_speed_up: {
            id: 'bullet_speed_up',
            name: 'High Velocity Rounds',
            description: 'Bullets travel 15% faster (40% on final rank)',
            type: 'weapon_upgrade',
            maxStacks: 10,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const speedMultiplier = isLastRank ? 1.40 : 1.15;
                game.player.weapon.bulletSpeed *= speedMultiplier;
            }
        },
        double_shot: {
            id: 'double_shot',
            name: 'Dual Barrel',
            description: 'Modified weapon fires two bullets (Requires Level 3)',
            type: 'weapon_type',
            requires: () => game.player.weapon.level === 1 && game.player.level >= 3,
            apply: () => {
                game.player.weapon.type = 'double';
                game.player.weapon.level = 2;
                document.getElementById('weapon-text').textContent = 'Weapon: Dual Barrel';
            }
        },
        triple_shot: {
            id: 'triple_shot',
            name: 'Burst Fire',
            description: 'Three-round burst weapon (Requires Level 8)',
            type: 'weapon_type',
            requires: () => game.player.weapon.level === 2 && game.player.level >= 8,
            apply: () => {
                game.player.weapon.type = 'triple';
                game.player.weapon.level = 3;
                document.getElementById('weapon-text').textContent = 'Weapon: Burst Fire';
            }
        },
        quad_shot: {
            id: 'quad_shot',
            name: 'Quad Burst',
            description: 'Fires 4 bullets in a focused spread (Requires Level 15)',
            type: 'weapon_type',
            requires: () => game.player.weapon.level === 3 && game.player.level >= 15,
            apply: () => {
                game.player.weapon.type = 'quad';
                game.player.weapon.level = 4;
                document.getElementById('weapon-text').textContent = 'Weapon: Quad Burst';
            }
        },
        shotgun: {
            id: 'shotgun',
            name: 'Combat Shotgun',
            description: 'Devastating close-range spread (Requires Level 25)',
            type: 'weapon_type',
            requires: () => game.player.weapon.level === 4 && game.player.level >= 25,
            apply: () => {
                game.player.weapon.type = 'shotgun';
                game.player.weapon.level = 5;
                document.getElementById('weapon-text').textContent = 'Weapon: Combat Shotgun';
            }
        },
        explosive_rounds: {
            id: 'explosive_rounds',
            name: 'Incendiary Rounds',
            description: 'Bullets create fiery explosions (Requires Level 10)',
            type: 'weapon_modifier',
            requires: () => game.player.weapon.level >= 2 && !game.player.weapon.explosive && game.player.level >= 10,
            apply: () => {
                game.player.weapon.explosive = true;
                game.allSkills.explosive_rounds.currentStacks = 1;
            },
            onHit: function(bullet, enemy, damage) {
                if (bullet.explosive) {
                    game.createExplosion(bullet.x, bullet.y);
                }
            }
        },
        piercing_bullets: {
            id: 'piercing_bullets',
            name: 'Armor Piercing',
            description: 'Bullets tear through multiple zombies (Requires Level 6)',
            type: 'weapon_modifier',
            requires: () => game.player.weapon.level >= 2 && !game.player.weapon.piercing && game.player.level >= 6,
            apply: () => {
                game.player.weapon.piercing = true;
                game.allSkills.piercing_bullets.currentStacks = 1;
            }
        },
        dodge_chance: {
            id: 'dodge_chance',
            name: 'Evasive Maneuvers',
            description: '8% chance to dodge (20% on final rank, max 70%)',
            type: 'passive',
            maxStacks: 10,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const dodgeAmount = isLastRank ? 0.20 : 0.08;
                if (!game.player.dodgeChance) game.player.dodgeChance = 0;
                game.player.dodgeChance = Math.min(0.7, game.player.dodgeChance + dodgeAmount);
            },
            canDodge: function() {
                return game.player.dodgeChance && Math.random() < game.player.dodgeChance;
            }
        },
        knockback: {
            id: 'knockback',
            name: 'Stopping Power',
            description: 'Bullets push zombies back slightly (Requires Level 5)',
            type: 'weapon_modifier',
            requires: () => game.player.level >= 5 && !game.player.weapon.knockback,
            apply: () => {
                game.player.weapon.knockback = true;
                game.allSkills.knockback.currentStacks = 1;
            },
            onHit: function(bullet, enemy, damage) {
                if (game.player.weapon.knockback) {
                    const knockbackForce = enemy.isBoss ? 0.1 : 0.3;
                    enemy.x += bullet.direction.x * knockbackForce;
                    enemy.y += bullet.direction.y * knockbackForce;
                }
            }
        },
        life_steal: {
            id: 'life_steal',
            name: 'Blood Transfusion',
            description: 'Heal 2 HP per 10 kills (5 HP on final rank) (Requires Level 7)',
            type: 'passive',
            maxStacks: 5,
            currentStacks: 0,
            requires: () => game.player.level >= 7,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                this.healAmount = isLastRank ? 5 : 2;
                if (!game.player.killCount) game.player.killCount = 0;
            },
            onKill: function(enemy) {
                if (!game.player.killCount) game.player.killCount = 0;
                game.player.killCount++;
                
                if (game.player.killCount >= 10) {
                    const healAmount = this.healAmount || 2;
                    game.player.health = Math.min(game.player.maxHealth, game.player.health + healAmount);
                    game.player.killCount -= 10;
                    document.getElementById('health-value').style.width =
                        `${(game.player.health / game.player.maxHealth) * 100}%`;
                    game.showNotification(`Life Steal: +${healAmount} HP`);
                }
            }
        },
        critical_chance: {
            id: 'critical_chance',
            name: 'Sharpshooter',
            description: '5% chance for double damage (15% on final rank, max 60%)',
            type: 'weapon_upgrade',
            maxStacks: 12,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const critAmount = isLastRank ? 0.15 : 0.05;
                if (!game.player.weapon.critChance) game.player.weapon.critChance = 0;
                game.player.weapon.critChance = Math.min(0.6, game.player.weapon.critChance + critAmount);
            },
            modifyDamage: function(damage, enemy, bullet) {
                if (game.player.weapon.critChance && Math.random() < game.player.weapon.critChance) {
                    if (bullet) bullet.isCritical = true;
                    return damage * 2.5;
                }
                return damage;
            }
        },
        boss_damage: {
            id: 'boss_damage',
            name: 'Giant Killer',
            description: '20% more boss damage (50% on final rank) (Requires Level 12)',
            type: 'passive',
            maxStacks: 6,
            currentStacks: 0,
            requires: () => game.player.level >= 12,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                this.damageBonus = isLastRank ? 0.50 : 0.20;
                if (!game.player.bossDamageBonus) game.player.bossDamageBonus = 0;
                game.player.bossDamageBonus += this.damageBonus;
            },
            modifyDamage: function(damage, enemy, bullet) {
                if (enemy.isBoss && game.player.bossDamageBonus) {
                    return damage * (1 + game.player.bossDamageBonus);
                }
                return damage;
            }
        },
        grenade_chance: {
            id: 'grenade_chance',
            name: 'Explosive Surprise',
            description: '5% chance on kill for grenade behind you (15% on final rank, max 35%)',
            type: 'passive',
            maxStacks: 8,
            currentStacks: 0,
            apply: function() {
                const isLastRank = this.currentStacks === this.maxStacks - 1;
                const grenadeAmount = isLastRank ? 0.15 : 0.05;
                if (!game.player.grenadeChance) game.player.grenadeChance = 0;
                game.player.grenadeChance = Math.min(0.35, game.player.grenadeChance + grenadeAmount);
            },
            onKill: function(enemy) {
                if (game.player.grenadeChance && Math.random() < game.player.grenadeChance) {
                    const targetEnemy = game.findClosestEnemyBehind();
                    if (targetEnemy) {
                        game.throwGrenade(targetEnemy);
                    }
                }
            }
        },
        berserker_rage: {
            id: 'berserker_rage',
            name: 'Berserker Rage',
            description: 'Gain 30% attack speed for 3s after kill (5s on final rank). 15s cooldown (10s on final rank)',
            type: 'passive',
            maxStacks: 5,
            currentStacks: 0,
            requires: () => game.player.level >= 10,
            apply: function() {
                this.duration = this.currentStacks === this.maxStacks - 1 ? 5 : 3;
                this.cooldownDuration = this.currentStacks === this.maxStacks - 1 ? 10 : 15;
                this.cooldownTimer = 0;
                this.isActive = false;
            },
            onKill: function(enemy) {
                // Check if on cooldown
                if (this.cooldownTimer > 0) {
                    return;
                }
                
                // Check if already active
                if (this.isActive || hasBuff('berserker_rage')) {
                    return;
                }
                
                // Store the CURRENT fire rate right before activating
                const currentFireRate = game.player.weapon.fireRate;
                this.isActive = true;
                
                // Apply the buff
                addBuff('berserker_rage', this.duration, 
                    () => {
                        // Effect while buff is active - 30% faster (lower fireRate = faster shooting)
                        game.player.weapon.fireRate = currentFireRate * 0.7;
                    },
                    () => {
                        // On expire - restore the fire rate we stored
                        game.player.weapon.fireRate = currentFireRate;
                        this.isActive = false;
                        this.cooldownTimer = this.cooldownDuration;
                        game.showNotification('Berserker Rage ended - cooling down');
                    }
                );
                game.showNotification('Berserker Rage activated!');
            },
            onUpdate: function(dt) {
                // Update cooldown timer
                if (this.cooldownTimer > 0) {
                    this.cooldownTimer -= dt;
                    if (this.cooldownTimer <= 0) {
                        this.cooldownTimer = 0;
                        game.showNotification('Berserker Rage ready!');
                    }
                }
            }
        },
        freeze_shot: {
            id: 'freeze_shot',
            name: 'Freeze Shot',
            description: '10% chance to freeze enemies for 2s (20% on final rank)',
            type: 'weapon_modifier',
            maxStacks: 5,
            currentStacks: 0,
            requires: () => game.player.level >= 8,
            apply: function() {
                this.freezeChance = this.currentStacks === this.maxStacks - 1 ? 0.20 : 0.10;
            },
            onHit: function(bullet, enemy, damage) {
                if (!enemy.frozen && Math.random() < this.freezeChance) {
                    enemy.frozen = true;
                    enemy.originalSpeed = enemy.speed;
                    enemy.speed = 0;
                    enemy.freezeDuration = 2;
                    enemy.originalColor = enemy.color;
                    enemy.color = '#4169E1';
                }
            },
            onUpdate: function(dt) {
                for (const enemy of game.enemies) {
                    if (enemy.frozen && enemy.freezeDuration !== undefined) {
                        enemy.freezeDuration -= dt;
                        if (enemy.freezeDuration <= 0) {
                            enemy.frozen = false;
                            enemy.speed = enemy.originalSpeed;
                            enemy.color = enemy.originalColor;
                        }
                    }
                }
            }
        },
        thorns: {
            id: 'thorns',
            name: 'Thorns',
            description: 'Reflect 20% of damage back to attackers (50% on final rank)',
            type: 'passive',
            maxStacks: 5,
            currentStacks: 0,
            apply: function() {
                this.reflectPercent = this.currentStacks === this.maxStacks - 1 ? 0.50 : 0.20;
            },
            onDamageTaken: function(enemy, damage) {
                const reflectDamage = damage * this.reflectPercent;
                enemy.health -= reflectDamage;
                game.createHitEffect(enemy.x, enemy.y, false);
            }
        },
        chain_lightning: {
            id: 'chain_lightning',
            name: 'Chain Lightning',
            description: '15% chance for bullets to chain to 3 enemies (6 on final rank)',
            type: 'weapon_modifier',
            maxStacks: 8,
            currentStacks: 0,
            requires: () => game.player.level >= 15,
            apply: function() {
                this.chainChance = 0.15;
                this.chainCount = this.currentStacks === this.maxStacks - 1 ? 6 : 3;
            },
            onHit: function(bullet, enemy, damage) {
                if (Math.random() < this.chainChance) {
                    const chainedEnemies = new Set([enemy]);
                    let currentTarget = enemy;
                    
                    for (let i = 0; i < this.chainCount; i++) {
                        let closestEnemy = null;
                        let closestDist = Infinity;
                        
                        for (const e of game.enemies) {
                            if (chainedEnemies.has(e) || e.health <= 0) continue;
                            
                            const dx = e.x - currentTarget.x;
                            const dy = e.y - currentTarget.y;
                            const dist = dx * dx + dy * dy;
                            
                            if (dist < closestDist && dist < 25) {
                                closestDist = dist;
                                closestEnemy = e;
                            }
                        }
                        
                        if (closestEnemy) {
                            closestEnemy.health -= damage * 0.7;
                            game.createHitEffect(closestEnemy.x, closestEnemy.y, false);
                            chainedEnemies.add(closestEnemy);
                            currentTarget = closestEnemy;
                        } else {
                            break;
                        }
                    }
                }
            }
        },
        damage_aura: {
            id: 'damage_aura',
            name: 'Damage Aura',
            description: 'Deal 10 damage/sec to nearby enemies (25 on final rank)',
            type: 'passive',
            maxStacks: 5,
            currentStacks: 0,
            apply: function() {
                this.auraDamage = this.currentStacks === this.maxStacks - 1 ? 25 : 10;
                this.auraRadius = 3;
            },
            onUpdate: function(dt) {
                for (const enemy of game.enemies) {
                    const dx = enemy.x - game.player.x;
                    const dy = enemy.y - game.player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist <= this.auraRadius) {
                        enemy.health -= this.auraDamage * dt;
                    }
                }
            }
        },
    };
}

class SkillManager {
    constructor(game) {
        this.game = game;
    }
    
    modifyDamage(baseDamage, enemy, bullet) {
        let damage = baseDamage;
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.modifyDamage) {
                damage = skill.modifyDamage(damage, enemy, bullet);
            }
        }
        return damage;
    }
    
    modifyDamageTaken(baseDamage, enemy) {
        let damage = baseDamage;
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.modifyDamageTaken) {
                damage = skill.modifyDamageTaken(damage, enemy);
            }
        }
        return damage;
    }
    
    canDodge() {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.canDodge && skill.canDodge()) {
                return true;
            }
        }
        return false;
    }
    
    onHit(bullet, enemy, damage) {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onHit) {
                skill.onHit(bullet, enemy, damage);
            }
        }
    }
    
    onKill(enemy) {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onKill) {
                skill.onKill(enemy);
            }
        }
    }
    
    onDamageTaken(enemy, damage) {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onDamageTaken) {
                skill.onDamageTaken(enemy, damage);
            }
        }
    }
    
    onUpdate(dt) {
        if (this.game.player.buffs) {
            for (const buffId in this.game.player.buffs) {
                const buff = this.game.player.buffs[buffId];
                buff.duration -= dt;
                
                if (buff.duration <= 0) {
                    if (buff.onExpire) buff.onExpire();
                    delete this.game.player.buffs[buffId];
                } else {
                    if (buff.effect) buff.effect();
                }
            }
        }
        
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onUpdate) {
                skill.onUpdate(dt);
            }
        }
    }
    
    onBulletFire(bullet) {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onBulletFire) {
                skill.onBulletFire(bullet);
            }
        }
    }
    
    onEnemySpawn(enemy) {
        for (const skillId in this.game.allSkills) {
            const skill = this.game.allSkills[skillId];
            if (skill.currentStacks > 0 && skill.onEnemySpawn) {
                skill.onEnemySpawn(enemy);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSkills, SkillManager };
}

if (typeof window !== 'undefined') {
    window.createSkills = createSkills;
    window.SkillManager = SkillManager;
}
