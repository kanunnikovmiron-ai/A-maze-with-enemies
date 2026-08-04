/**
 * Секретный босс — розовое сердце (1x1, HP 10).
 * Встречается на отдельной арене за розовой трещиной.
 * Кидает бомбы (⚠ -> 🔥 через ход) и преследует игрока.
 * Победа мечом (10 ударов) даёт 30 монет.
 */
class SecretBossEnemy extends Enemy {
    constructor(id, y, x, config, gameConfig) {
        const bossConfig = {
            visionRange: 8,              // Видит всю арену
            agroLimit: 999,              // Не "остывает"
            count: config.count,
            patrolCount: config.patrolCount,
            prefix: 'H',
            colors: {
                chase: '#ff6b9d',
                searching: '#ff6b9d',
                waiting: '#ff6b9d',
                returning: '#ff6b9d',
                patrol: '#ff6b9d'
            },
            glows: {
                chase: { color: '#f39', blur: 10 },
                searching: { color: '#f39', blur: 6 },
                waiting: { color: '#f39', blur: 3 },
                returning: { color: 'transparent', blur: 0 },
                patrol: { color: 'transparent', blur: 0 }
            }
        };

        super(id, y, x, bossConfig, gameConfig);

        this.type = 'secretBoss';    // Тип врага
        this.maxHp = 10;             // Всего ударов для победы
        this.hp = 10;                // Текущее HP
        this.defeated = false;       // Повержен ли
        this.bombCooldown = 0;       // Кулдаун бомб (ходов)
    }

    /**
     * Обновление: преследование игрока и бросание бомб
     */
    update(player, maze, enemies, getRandomPassable, hazards) {
        if (this.defeated) return null;

        const dist = Math.abs(this.y - player.y) + Math.abs(this.x - player.x);

        // Бомбы: кидаем по кулдауну независимо от дистанции (рядом — чаще)
        this.bombCooldown--;
        if (this.bombCooldown <= 0) {
            this.throwBomb(player, maze, hazards, dist === 1);
            this.bombCooldown = dist === 1
                ? 1 + Math.floor(Math.random() * 2)   // вплотную: 1-2 хода
                : 2 + Math.floor(Math.random() * 2); // на дистанции: 2-3 хода
        }

        // Преследование игрока
        if (dist > 1) {
            const path = PathFinder.findPath(this, player, maze, this.gameConfig.rows, this.gameConfig.cols);
            if (path && path.length > 0) {
                const next = path[0];
                if (this.canMoveTo(next.y, next.x, enemies, maze)) {
                    this.y = next.y;
                    this.x = next.x;
                }
            }
        }

        return this.checkCollision(player, maze, enemies, getRandomPassable);
    }

    /**
     * Бросок бомбы: предупреждение ⚠ в радиусе 2-3 от игрока, на след. ход 🔥
     * @param {Object} player - позиция игрока
     * @param {Array} maze - лабиринт
     * @param {Array} hazards - список опасных клеток
     * @param {boolean} melee - бросок вплотную (меньший радиус, точнее)
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
        hazards.push({ y: bomb.y, x: bomb.x, phase: 'warn', ttl: 1, bomb: true });
    }

    /**
     * Удар мечом: -1 HP, при 0 — повержен (+30 монет), иначе отброс
     * @param {Object} game - объект игры
     * @returns {Object} {type, message}
     */
    takeSwordHit(game) {
        if (this.defeated) return null;

        this.hp--;
        // HP/повержение арены хранится отдельно: сердца на карте не должны влиять на арену
        if (game.secretBoss && game.inSecretBossRoom) game.secretBoss.hp = this.hp;
        if (this.hp <= 0) {
            this.defeated = true;
            this.chase = false;
            this.searching = false;
            if (game.secretBoss && game.inSecretBossRoom) game.secretBoss.defeated = true;
            // Убираем труп сердца из игры: он не должен наносить урон и давать монеты
            const idx = game.enemies.indexOf(this);
            if (idx !== -1) game.enemies.splice(idx, 1);
            if (typeof game.resumeLevelMusic === 'function') game.resumeLevelMusic();
            const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { secretBoss: 30 };
            const first = !game.secretBossCoinsGranted;
            if (first) {
                game.grantCoins(R.secretBoss);
                game.secretBossCoinsGranted = true;
            }
            return {
                type: 'bossDefeated',
                message: first ? '💖 Секретный босс повержен! (+30 монет)' : '💖 Секретный босс повержен!'
            };
        }

        // Отброс сердца в случайную проходимую клетку
        const cell = game.getRandomPassable([game.player, ...game.enemies.filter(e => e !== this)]);
        this.y = cell.y;
        this.x = cell.x;
        this.homeY = cell.y;
        this.homeX = cell.x;
        this.resetState(game.maze);
        return { type: 'repelled', message: `💖 Босс отброшен! Осталось HP: ${this.hp}` };
    }

    /**
     * Сообщение при поимке игрока
     */
    getCatchMessage() {
        return '💀 ПОРАЖЕНИЕ! Розовое сердце коснулось вас!';
    }

    /**
     * Сообщение при отбрасывании
     */
    getRepelMessage() {
        return '🛡 Сердце отброшено.';
    }
}
