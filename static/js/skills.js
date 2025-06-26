// Skills system for the isometric game
// This function returns all skills with their properties and apply functions

// HOW TO ADD A NEW SKILL:
// 1. Add a new skill object to the return statement below
// 2. Give it a unique id, name, and description
// 3. Set the type: 'passive', 'weapon_upgrade', 'weapon_type', or 'weapon_modifier'
// 4. If it's stackable, add maxStacks and currentStacks (starting at 0)
// 5. If it has requirements, add a requires function that returns true/false
// 6. Add the apply function that implements the skill's effect
// 7. For final rank bonuses, check if currentStacks === maxStacks - 1
// 8. For active effects, you'll need to add the logic in game.js update() method

// Example new skill:
// teleport_dodge: {
//     id: 'teleport_dodge',
//     name: 'Phase Shift',
//     description: 'Teleport away when hit (5s cooldown, 2s on final rank)',
//     type: 'passive',
//     maxStacks: 5,
//     currentStacks: 0,
//     requires: () => game.player.level >= 20,
//     apply: () => {
//         const isLastRank = game.allSkills.teleport_dodge.currentStacks === game.allSkills.teleport_dodge.maxStacks - 1;
//         if (!game.player.teleportCooldown) game.player.teleportCooldown = 0;
//         game.player.teleportCooldown = isLastRank ? 2 : 5;
//     }
// },

function createSkills(game) {
    return {
        health_boost: {
            id: 'health_boost',
            name: 'First Aid Kit',
            description: 'Find medical supplies (+20 health, +40 on final rank)',
            type: 'passive',
            maxStacks: 20,
            currentStacks: 0,
            apply: () => {
                const isLastRank = game.allSkills.health_boost.currentStacks === game.allSkills.health_boost.maxStacks - 1;
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
            apply: () => {
                const isLastRank = game.allSkills.speed_boost.currentStacks === game.allSkills.speed_boost.maxStacks - 1;
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
            apply: () => {
                if (!game.player.healthRegen) game.player.healthRegen = 0;
                const isLastRank = game.allSkills.health_regen.currentStacks === game.allSkills.health_regen.maxStacks - 1;
                const regenAmount = isLastRank ? 3 : 1;
                game.player.healthRegen += regenAmount;
            }
        },
        damage_resistance: {
            id: 'damage_resistance',
            name: 'Reinforced Armor',
            description: 'Take 5% less damage (10% on final rank, max 60%)',
            type: 'passive',
            maxStacks: 10,
            currentStacks: 0,
            apply: () => {
                if (!game.player.damageResistance) game.player.damageResistance = 0;
                const isLastRank = game.allSkills.damage_resistance.currentStacks === game.allSkills.damage_resistance.maxStacks - 1;
                const resistAmount = isLastRank ? 0.10 : 0.05;
                game.player.damageResistance = Math.min(0.6, game.player.damageResistance + resistAmount);
            }
        },
        damage_up: {
            id: 'damage_up',
            name: 'Hollow Points',
            description: 'More stopping power (+5 damage, +15 on final rank)',
            type: 'weapon_upgrade',
            maxStacks: 25,
            currentStacks: 0,
            apply: () => {
                const isLastRank = game.allSkills.damage_up.currentStacks === game.allSkills.damage_up.maxStacks - 1;
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
            apply: () => {
                const isLastRank = game.allSkills.fire_rate_up.currentStacks === game.allSkills.fire_rate_up.maxStacks - 1;
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
            apply: () => {
                const isLastRank = game.allSkills.bullet_speed_up.currentStacks === game.allSkills.bullet_speed_up.maxStacks - 1;
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
            name: 'Makeshift Turret',
            description: 'Jury-rigged quad barrel (Requires Level 15)',
            type: 'weapon_type',
            requires: () => game.player.weapon.level === 3 && game.player.level >= 15,
            apply: () => {
                game.player.weapon.type = 'quad';
                game.player.weapon.level = 4;
                document.getElementById('weapon-text').textContent = 'Weapon: Makeshift Turret';
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
            }
        },
        dodge_chance: {
            id: 'dodge_chance',
            name: 'Evasive Maneuvers',
            description: '8% chance to dodge (20% on final rank, max 70%)',
            type: 'passive',
            maxStacks: 10,
            currentStacks: 0,
            apply: () => {
                if (!game.player.dodgeChance) game.player.dodgeChance = 0;
                const isLastRank = game.allSkills.dodge_chance.currentStacks === game.allSkills.dodge_chance.maxStacks - 1;
                const dodgeAmount = isLastRank ? 0.20 : 0.08;
                game.player.dodgeChance = Math.min(0.7, game.player.dodgeChance + dodgeAmount);
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
            apply: () => {
                if (!game.player.lifeSteal) game.player.lifeSteal = 0;
                const isLastRank = game.allSkills.life_steal.currentStacks === game.allSkills.life_steal.maxStacks - 1;
                const healAmount = isLastRank ? 5 : 2;
                game.player.lifeSteal += healAmount;
                if (!game.player.killCount) game.player.killCount = 0;
            }
        },
        critical_chance: {
            id: 'critical_chance',
            name: 'Sharpshooter',
            description: '5% chance for double damage (15% on final rank, max 60%)',
            type: 'weapon_upgrade',
            maxStacks: 12,
            currentStacks: 0,
            apply: () => {
                if (!game.player.weapon.critChance) game.player.weapon.critChance = 0;
                const isLastRank = game.allSkills.critical_chance.currentStacks === game.allSkills.critical_chance.maxStacks - 1;
                const critAmount = isLastRank ? 0.15 : 0.05;
                game.player.weapon.critChance = Math.min(0.6, game.player.weapon.critChance + critAmount);
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
            apply: () => {
                if (!game.player.bossDamageBonus) game.player.bossDamageBonus = 0;
                const isLastRank = game.allSkills.boss_damage.currentStacks === game.allSkills.boss_damage.maxStacks - 1;
                const damageBonus = isLastRank ? 0.50 : 0.20;
                game.player.bossDamageBonus += damageBonus;
            }
        },
        grenade_chance: {
            id: 'grenade_chance',
            name: 'Explosive Surprise',
            description: '5% chance on kill for grenade behind you (15% on final rank, max 35%)',
            type: 'passive',
            maxStacks: 8,
            currentStacks: 0,
            apply: () => {
                if (!game.player.grenadeChance) game.player.grenadeChance = 0;
                const isLastRank = game.allSkills.grenade_chance.currentStacks === game.allSkills.grenade_chance.maxStacks - 1;
                const grenadeAmount = isLastRank ? 0.15 : 0.05;
                game.player.grenadeChance = Math.min(0.35, game.player.grenadeChance + grenadeAmount);
            }
        },
        
        // Example: To add a new skill, just add it here:
        // rapid_reload: {
        //     id: 'rapid_reload',
        //     name: 'Rapid Reload',
        //     description: 'Instant reload every 5 kills (3 kills on final rank)',
        //     type: 'passive',
        //     maxStacks: 5,
        //     currentStacks: 0,
        //     apply: () => {
        //         const isLastRank = game.allSkills.rapid_reload.currentStacks === game.allSkills.rapid_reload.maxStacks - 1;
        //         if (!game.player.rapidReload) game.player.rapidReload = 0;
        //         game.player.rapidReload = isLastRank ? 3 : 5;
        //     }
        // },
        
        // Another example with more complex logic:
        // chain_lightning: {
        //     id: 'chain_lightning',
        //     name: 'Chain Lightning',
        //     description: '10% chance for bullets to chain to 2 enemies (5 on final rank)',
        //     type: 'weapon_modifier',
        //     maxStacks: 8,
        //     currentStacks: 0,
        //     requires: () => game.player.level >= 15 && game.player.weapon.level >= 3,
        //     apply: () => {
        //         const isLastRank = game.allSkills.chain_lightning.currentStacks === game.allSkills.chain_lightning.maxStacks - 1;
        //         if (!game.player.weapon.chainLightning) {
        //             game.player.weapon.chainLightning = {
        //                 chance: 0,
        //                 chains: 0
        //             };
        //         }
        //         game.player.weapon.chainLightning.chance += 0.10;
        //         game.player.weapon.chainLightning.chains = isLastRank ? 5 : 2;
        //     }
        // },
    };
}

// Export the createSkills function
// Works in both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createSkills;
}

// For browser usage
if (typeof window !== 'undefined') {
    window.createSkills = createSkills;
}
