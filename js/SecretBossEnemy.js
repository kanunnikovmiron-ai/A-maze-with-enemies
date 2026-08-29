/**
 * Секретный босс — фиолетовый гексагон со шипами (1x1, HP 10).
 * Встречается на отдельной арене за розовой трещиной.
 * Паттерн движения: Patrol + Chase (как обычный враг), без возврата.
 * Кидает бомбы (⚠ -> 🔥 через ход).
 * Победа мечом (10 ударов) даёт 30 монет.
 */
class SecretBossEnemy extends Enemy {
    constructor(id, y, x, config, gameConfig) {
        const bossConfig = {
            visionRange: 4,              // Видит игрока в радиусе 4 клеток (LOS)
            agroLimit: 3,                // 3 хода ищет на последней позиции, потом патрулирует
            count: config.count,
            patrolCount: config.patrolCount,
            prefix: 'H',
            colors: {
                chase: '#9b59b6',
                searching: '#8e44ad',
                waiting: '#7d3c98',
                returning: 'transparent',
                patrol: '#8e44ad'
            },
            glows: {
                chase: { color: '#9b59b6', blur: 12 },
                searching: { color: '#8e44ad', blur: 8 },
                waiting: { color: '#7d3c98', blur: 4 },
                returning: { color: 'transparent', blur: 0 },
                patrol: { color: '#8e44ad', blur: 3 }
            }
        };

        super(id, y, x, bossConfig, gameConfig);

        this.type = 'secretBoss';
        this.maxHp = 10;
        this.hp = 10;
        this.defeated = false;
        this.bombCooldown = 0;
    }

    /**
     * Обновление: паттерн как у обычного врага (chase/search/patrol) + бомбы
     */
    update(player, maze, enemies, getRandomPassable, hazards) {
        if (this.defeated) return null;

        // Бомбы: кидаем по кулдауну независимо от состояния
        const dist = Math.abs(this.y - player.y) + Math.abs(this.x - player.x);
        this.bombCooldown--;
        if (this.bombCooldown <= 0) {
            this.throwBomb(player, maze, hazards, dist === 1);
            this.bombCooldown = dist === 1
                ? 1 + Math.floor(Math.random() * 2)
                : 2 + Math.floor(Math.random() * 2);
        }

        // Движение как у обычного врага: handleState + chase/search/patrol
        this.handleState(player, maze, enemies, getRandomPassable);

        if ((this.chase || this.searching) && this.path.length > 0) {
            const next = this.path[0];
            let canStep = this.canMoveTo(next.y, next.x, enemies, maze);

            const wasAdjacent = this.chase &&
                Math.abs(this.y - player.prevY) + Math.abs(this.x - player.prevX) === 1;
            if (wasAdjacent) {
                this.adjacentPause = !this.adjacentPause;
                if (this.adjacentPause) canStep = false;
            } else {
                this.adjacentPause = false;
            }

            if (canStep) {
                this.path.shift();
                this.y = next.y;
                this.x = next.x;
            }
        } else if (!this.chase && !this.searching && this.loseCount === 0) {
            this.patrolMove(maze, enemies);
        }

        return this.checkCollision(player, maze, enemies, getRandomPassable);
    }

    /**
     * Патрулирование: случайный обход (как у обычного врага)
     */
    patrolMove(maze, enemies) {
        if (this.waitTimer > 0) {
            this.waitTimer--;
            return;
        }
        const move = this.getRandomPatrolMove(maze, enemies);
        if (move) {
            this.y += move[0];
            this.x += move[1];
            this.homeY = this.y;
            this.homeX = this.x;
            if (Math.random() < 0.2) {
                this.waitTimer = Math.floor(Math.random() * 2);
            }
        }
    }

    /**
     * Сброс состояния: патрулирование (без возврата)
     */
    resetState(maze) {
        this.chase = false;
        this.searching = false;
        this.loseCount = 0;
    }

    /**
     * Бросок бомбы: предупреждение ⚠ в радиусе 2-3 от игрока, на след. ход 🔥
     */
    throwBomb(player, maze, hazards, melee) {
        const radius = melee ? 2 : 3;
        const candidates = [];
        const rows = this.gameConfig.rows;
        const cols = this.gameConfig.cols;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (Math.abs(dy) + Math.abs(dx) > radius) continue;
                if (dy === 0 && dx === 0) continue;
                const ny = player.y + dy;
                const nx = player.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (maze[ny][nx] === 1) continue;
                if (ny === this.y && nx === this.x) continue;
                if (hazards.some(h => h.y === ny && h.x === nx)) continue;
                candidates.push({ y: ny, x: nx });
            }
        }
        if (candidates.length === 0) return;

        const bomb = candidates[Math.floor(Math.random() * candidates.length)];
        hazards.push({ y: bomb.y, x: bomb.x, phase: 'warn', ttl: 1, bomb: true, warnUntil: Date.now() + 4000 });
    }

    /**
     * Удар мечом: -1 HP, при 0 — повержен (+30 монет), иначе отброс
     */
    takeSwordHit(game) {
        if (this.defeated) return null;

        this.hp--;
        if (game.secretBoss && game.inSecretBossRoom) game.secretBoss.hp = this.hp;
        if (this.hp <= 0) {
            this.defeated = true;
            this.chase = false;
            this.searching = false;
            if (game.secretBoss && game.inSecretBossRoom) game.secretBoss.defeated = true;
            const idx = game.enemies.indexOf(this);
            if (idx !== -1) game.enemies.splice(idx, 1);
            if (typeof game.resumeLevelMusic === 'function') game.resumeLevelMusic();
            const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { secretBoss: 30 };
            const first = !game.secretBossCoinsGranted;
            if (first) {
                game.grantCoins(R.secretBoss);
                game.secretBossCoinsGranted = true;
            }
            if (typeof updateStat === 'function') { updateStat('secretBossDefeated', 1); unlockAchievement('secret_killer'); checkAchievements(); }
            return {
                type: 'bossDefeated',
                message: first ? t('msg_secret_boss_defeated_first') : t('msg_secret_boss_defeated')
            };
        }

        const cell = game.getRandomPassable([game.player, ...game.enemies.filter(e => e !== this)]);
        this.y = cell.y;
        this.x = cell.x;
        this.homeY = cell.y;
        this.homeX = cell.x;
        this.resetState(game.maze);
        return { type: 'repelled', message: t('msg_secret_boss_repelled', this.hp) };
    }

    /**
     * Сообщение при поимке игрока
     */
    getCatchMessage() {
        return t('msg_defeat_heart');
    }

    /**
     * Сообщение при отбрасывании
     */
    getRepelMessage() {
        return t('msg_heart_repelled');
    }
}
