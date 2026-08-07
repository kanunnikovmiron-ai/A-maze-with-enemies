/**
 * Класс босса последнего уровня (арена 20x20)
 * Чёрный шестиугольник, занимает блок 2x2 клетки. HP 6, победить можно мечом
 * из секретной комнаты (удар Пробелом = 1 HP + отброс) или настройкой
 * «Неуязвимость» (касание = удар). В простое блуждает по комнате.
 * В погоне босс использует уникальные атаки (лава, огненное кольцо, огненный дождь):
 * сначала ставит предупреждения ⚠, на следующем ходу они становятся огнём 🔥.
 */
class BossEnemy extends Enemy {
    /**
     * @param {string} id - идентификатор босса (B1)
     * @param {number} y - начальная координата Y (левый-верхний угол блока)
     * @param {number} x - начальная координата X (левый-верхний угол блока)
     * @param {EnemyConfig} config - конфигурация врагов
     * @param {Object} gameConfig - общая конфигурация игры
     */
    constructor(id, y, x, config, gameConfig) {
        const bossConfig = {
            visionRange: 8,              // Видит по прямой, но не всю арену
            agroLimit: 999,              // Не "остывает" в погоне
            count: config.count,
            patrolCount: config.patrolCount,
            prefix: 'B',
            colors: {
                chase: '#0a0a0a',
                searching: '#0a0a0a',
                waiting: '#0a0a0a',
                returning: '#0a0a0a',
                patrol: '#0a0a0a'
            },
            glows: {
                chase: { color: '#a00', blur: 8 },
                searching: { color: '#a00', blur: 6 },
                waiting: { color: '#a00', blur: 3 },
                returning: { color: 'transparent', blur: 0 },
                patrol: { color: 'transparent', blur: 0 }
            }
        };

        super(id, y, x, bossConfig, gameConfig);

        this.type = 'boss';          // Тип врага
        this.maxHp = 6;              // Всего ударов для победы
        this.hp = 6;                 // Текущее HP
        this.stage = 1;              // Стадия боя: 1 — обычная, 2 — ярость (HP <= 3)
        this.defeated = false;       // Повержен ли босс
        this.patrolRadius = 4;       // Радиус охраны дома (у финиша)
        this.wanderRadius = 6;       // Радиус блуждания от дома (в простое)
        this.wanderPath = [];        // Текущий маршрут блуждания
        this.wanderWait = 0;         // Пауза между блужданиями (ходов)
        this.attackCooldown = 3;     // Кулдаун уникальных атак (ходов)
        this.pathGoal = null;        // Текущая цель преследования
        this.adjacentPause = false;  // Флаг замедления при погоне вплотную
    }

    /**
     * Клетки блока 2x2 (левый-верхний угол = this.y, this.x)
     * @returns {Array} [{y,x}, ...] 4 клетки
     */
    getCells() {
        return [
            { y: this.y, x: this.x },
            { y: this.y, x: this.x + 1 },
            { y: this.y + 1, x: this.x },
            { y: this.y + 1, x: this.x + 1 }
        ];
    }

    /**
     * Проходим ли блок 2x2 (границы и все 4 клетки)
     * @param {number} y - верхняя строка
     * @param {number} x - левый столбец
     * @returns {boolean}
     */
    canPlace(y, x) {
        if (y < 0 || x < 0) return false;
        if (y + 1 >= this.gameConfig.rows || x + 1 >= this.gameConfig.cols) return false;
        for (const c of [[y, x], [y, x + 1], [y + 1, x], [y + 1, x + 1]]) {
            if (this.gameConfig.maze[c[0]][c[1]] !== 0) return false;
        }
        return true;
    }

    /**
     * Накрывает ли блок (y,x) клетку (py,px)
     */
    blockCovers(y, x, py, px) {
        return (y === py || y + 1 === py) && (x === px || x + 1 === px);
    }

    /**
     * Стоит ли блок вплотную к позиции игрока (Манхэттен-расстояние 1)
     * @param {number} py - позиция игрока до хода (prevY)
     * @param {number} px - позиция игрока до хода (prevX)
     * @returns {boolean}
     */
    isAdjacentToPlayer(py, px) {
        if (py === undefined || px === undefined) return false;
        for (const c of this.getCells()) {
            if (Math.abs(c.y - py) + Math.abs(c.x - px) === 1) return true;
        }
        return false;
    }

    /**
     * BFS по позициям блока 2x2 от (startY,startX) до (goalY,goalX)
     * @returns {Array|null} путь из {y,x} (без начальной позиции) или null
     */
    blockBfs(startY, startX, goalY, goalX) {
        if (!this.canPlace(startY, startX) || !this.canPlace(goalY, goalX)) return null;
        if (startY === goalY && startX === goalX) return [];

        const rows = this.gameConfig.rows;
        const cols = this.gameConfig.cols;
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
        const queue = [{ y: startY, x: startX }];
        visited[startY][startX] = true;

        while (queue.length > 0) {
            const cur = queue.shift();
            for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (!this.canPlace(ny, nx)) continue;
                if (visited[ny][nx]) continue;
                visited[ny][nx] = true;
                parent[ny][nx] = { y: cur.y, x: cur.x };
                if (ny === goalY && nx === goalX) {
                    const path = [];
                    let c = { y: goalY, x: goalX };
                    while (c.y !== startY || c.x !== startX) {
                        path.unshift(c);
                        c = parent[c.y][c.x];
                    }
                    return path;
                }
                queue.push({ y: ny, x: nx });
            }
        }
        return null;
    }

    /**
     * Видит ли босс игрока (от ближайшей клетки блока, с LOS по оси)
     * @param {Object} player - позиция игрока
     * @param {Array} maze - лабиринт
     * @returns {boolean}
     */
    blockSeesPlayer(player, maze) {
        let best = null;
        let bestDist = Infinity;
        for (const c of this.getCells()) {
            const d = Math.abs(c.y - player.y) + Math.abs(c.x - player.x);
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        if (!best || bestDist > this.config.visionRange) return false;

        // Игрок стоит на клетке босса (или вплотную) — босс его видит
        if (bestDist === 0) return true;

        if (best.x === player.x) {
            const step = player.y > best.y ? 1 : -1;
            for (let y = best.y + step; y !== player.y; y += step) {
                if (y < 0 || y >= maze.length) return false;
                if (maze[y][best.x] === 1) return false;
            }
            return true;
        }
        if (best.y === player.y) {
            const step = player.x > best.x ? 1 : -1;
            for (let x = best.x + step; x !== player.x; x += step) {
                if (x < 0 || x >= maze[0].length) return false;
                if (maze[best.y][x] === 1) return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Ближайшая проходимая позиция блока к игроку
     */
    nearestPlaceable(py, px, avoidCover) {
        const maxR = Math.max(this.gameConfig.rows, this.gameConfig.cols);
        for (let r = 0; r <= maxR; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dy) + Math.abs(dx) !== r) continue;
                    const y = py + dy;
                    const x = px + dx;
                    if (!this.canPlace(y, x)) continue;
                    if (avoidCover && this.blockCovers(y, x, py, px)) continue;
                    return { y, x };
                }
            }
        }
        return null;
    }

    /**
     * Цель преследования: позиция блока, накрывающая игрока (иначе ближайшая)
     */
    getChaseGoal(player, maze) {
        const py = player.y;
        const px = player.x;
        const candidates = [
            { y: py - 1, x: px - 1 },
            { y: py - 1, x: px },
            { y: py, x: px - 1 },
            { y: py, x: px }
        ];
        let best = null;
        let bestDist = Infinity;
        for (const c of candidates) {
            if (!this.canPlace(c.y, c.x)) continue;
            if (!this.blockCovers(c.y, c.x, py, px)) continue;
            const d = Math.abs(c.y - this.y) + Math.abs(c.x - this.x);
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }
        if (best) return best;
        return this.nearestPlaceable(py, px);
    }

    /**
     * Случайная проходимая позиция блока в радиусе wanderRadius от дома
     * @returns {Object} {y, x}
     */
    getWanderTarget() {
        const candidates = [];
        for (let dy = -this.wanderRadius; dy <= this.wanderRadius; dy++) {
            for (let dx = -this.wanderRadius; dx <= this.wanderRadius; dx++) {
                if (Math.abs(dy) + Math.abs(dx) > this.wanderRadius) continue;
                const y = this.homeY + dy;
                const x = this.homeX + dx;
                if (y === this.y && x === this.x) continue;
                if (!this.canPlace(y, x)) continue;
                candidates.push({ y, x });
            }
        }
        if (candidates.length === 0) return { y: this.homeY, x: this.homeX };
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Обновление босса: 2x2-движение, погоня/охрана, уникальные атаки
     */
    update(player, maze, enemies, getRandomPassable, hazards) {
        if (this.defeated) return null;

        // Страховка: блок не должен стоять в стене
        if (!this.canPlace(this.y, this.x)) {
            const cell = this.nearestPlaceable(player.y, player.x, true);
            if (cell) {
                this.y = cell.y;
                this.x = cell.x;
                this.homeY = cell.y;
                this.homeX = cell.x;
            }
        }

        const sees = this.blockSeesPlayer(player, maze);

        if (sees) {
            if (!this.chase) {
                this.chase = true;
                this.searching = false;
                this.returning = false;
                this.wanderPath = [];
                this.wanderWait = 0;
            }
            this.lastSeenPos = { y: player.y, x: player.x };

            // Уникальная атака (с кулдауном)
            if (hazards) {
                this.attackCooldown--;
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = 3 + Math.floor(Math.random() * 3);
                    this.performAttack(player, maze, hazards);
                }
            }

            // Цель преследования
            const goal = this.getChaseGoal(player, maze);
            if (goal && (!this.pathGoal || this.pathGoal.y !== goal.y || this.pathGoal.x !== goal.x)) {
                this.path = this.blockBfs(this.y, this.x, goal.y, goal.x);
                this.pathGoal = goal;
            }
        } else {
            if (this.chase) {
                // Потеряли игрока из виду — ищем на последней видимой позиции
                this.chase = false;
                this.searching = true;
                this.pathGoal = null;
                const seen = this.lastSeenPos;
                const goal = seen ? this.nearestPlaceable(seen.y, seen.x) : null;
                this.path = goal ? (this.blockBfs(this.y, this.x, goal.y, goal.x) || []) : [];
            } else if (this.searching) {
                // Дошли до последней позиции — поиск окончен
                this.pathGoal = null;
                if (!this.path || this.path.length === 0) {
                    this.searching = false;
                }
            } else {
                this.pathGoal = null;
            }

            // Возврат после отброса (returning задан resetStateBlock)
            if (this.returning) {
                if (!this.returnPath || this.returnPath.length === 0) {
                    this.returning = false;
                }
            } else if (!this.searching) {
                // Блуждание по комнате: пауза -> новая цель -> идти по BFS
                if (this.wanderWait > 0) {
                    this.wanderWait--;
                } else if (!this.wanderPath || this.wanderPath.length === 0) {
                    const target = this.getWanderTarget();
                    this.wanderPath = this.blockBfs(this.y, this.x, target.y, target.x) || [];
                    if (this.wanderPath.length === 0) this.wanderWait = 3;
                }
            }
        }

        // Движение по пути преследования
        if ((this.chase || this.searching) && this.path && this.path.length > 0) {
            const next = this.path.shift();
            if (!this.canPlace(next.y, next.x)) {
                this.path = [];
            } else {
                // Замедление вплотную: если в начале хода блок стоял рядом с игроком,
                // он двигается через ход — иначе от него невозможно убежать
                let move = true;
                const wasAdjacent = this.chase && this.isAdjacentToPlayer(player.prevY, player.prevX);
                if (wasAdjacent) {
                    this.adjacentPause = !this.adjacentPause;
                    if (this.adjacentPause) move = false;
                } else {
                    this.adjacentPause = false;
                }
                if (move) {
                    this.y = next.y;
                    this.x = next.x;
                }
            }
        } else if (this.returning && this.returnPath && this.returnPath.length > 0) {
            const next = this.returnPath.shift();
            if (this.canPlace(next.y, next.x)) {
                this.y = next.y;
                this.x = next.x;
            } else {
                this.returnPath = [];
            }
            if (this.returnPath.length === 0) {
                this.returning = false;
                this.homeY = this.y;
                this.homeX = this.x;
            }
        } else if (this.wanderPath && this.wanderPath.length > 0) {
            const next = this.wanderPath.shift();
            if (this.canPlace(next.y, next.x)) {
                this.y = next.y;
                this.x = next.x;
            } else {
                this.wanderPath = [];
            }
            if (this.wanderPath.length === 0) {
                this.wanderWait = 2 + Math.floor(Math.random() * 3);
            }
        }

        return this.checkCollision(player, maze, enemies, getRandomPassable, hazards);
    }

    /**
     * Уникальная атака босса (случайный выбор из 3; в стадии 2 — усиленные)
     */
    performAttack(player, maze, hazards) {
        const type = Math.floor(Math.random() * 3);
        let cells = [];
        if (type === 0) cells = this.attackFireLine(player, maze);
        else if (type === 1) cells = this.attackFireRing(maze, 3);
        else cells = this.attackFireRain(player, maze, [4, 6]);

        // Стадия 2: добавочный "Огненный взрыв" вокруг босса
        if (this.stage === 2) {
            cells = cells.concat(this.attackFireBurst(maze));
        }

        // Дедуп: одна клетка не должна попасть в hazards дважды
        const seen = new Set();
        for (const c of cells) {
            const key = c.y + ',' + c.x;
            if (seen.has(key)) continue;
            seen.add(key);
            if (this.blockCovers(this.y, this.x, c.y, c.x)) continue;
            if (hazards.some(h => h.y === c.y && h.x === c.x)) continue;
            hazards.push({ y: c.y, x: c.x, phase: 'warn', ttl: 1 });
        }
    }

    /**
     * Атака "Лавовая линия": ряд/столбец от босса к игроку.
     * В стадии 2 захватывает и соседний ряд/столбец (шире).
     */
    attackFireLine(player, maze) {
        const cells = [];
        const vertical = Math.abs(player.y - this.y) > Math.abs(player.x - this.x);
        if (vertical) {
            const col = player.x;
            const yStart = Math.min(this.y, player.y);
            const yEnd = Math.max(this.y + 1, player.y);
            for (let y = yStart; y <= yEnd; y++) {
                if (maze[y] && maze[y][col] === 0) cells.push({ y, x: col });
            }
        } else {
            const row = player.y;
            const xStart = Math.min(this.x, player.x);
            const xEnd = Math.max(this.x + 1, player.x);
            for (let x = xStart; x <= xEnd; x++) {
                if (maze[row] && maze[row][x] === 0) cells.push({ y: row, x });
            }
        }
        return cells;
    }

    /**
     * Атака "Огненное кольцо": кольцо Манхэттен-радиуса radius вокруг босса
     * @param {number} radius - радиус кольца (3 в стадии 1, 4 в стадии 2)
     */
    attackFireRing(maze, radius) {
        const r = radius || 3;
        const cells = [];
        const cy = this.y + 1;
        const cx = this.x + 1;
        const rows = this.gameConfig.rows;
        const cols = this.gameConfig.cols;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dy) + Math.abs(dx) !== r) continue;
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (maze[ny][nx] === 1) continue;
                if (this.blockCovers(this.y, this.x, ny, nx)) continue;
                cells.push({ y: ny, x: nx });
            }
        }
        return cells;
    }

    /**
     * Атака "Огненный дождь": случайные клетки в радиусе 3 от игрока.
     * В стадии 2 больше клеток (6-8 вместо 4-6).
     * @param {Array} countRange - диапазон количества клеток [min, max]
     */
    attackFireRain(player, maze, countRange) {
        const candidates = [];
        const rows = this.gameConfig.rows;
        const cols = this.gameConfig.cols;
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (Math.abs(dy) + Math.abs(dx) > 3) continue;
                const ny = player.y + dy;
                const nx = player.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (ny === player.y && nx === player.x) continue;
                if (maze[ny][nx] === 1) continue;
                if (this.blockCovers(this.y, this.x, ny, nx)) continue;
                candidates.push({ y: ny, x: nx });
            }
        }
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const range = countRange || [4, 6];
        const count = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
        return candidates.slice(0, count);
    }

    /**
     * Атака "Огненный взрыв": кольцо Манхэттен-радиуса 2 вокруг босса (только стадия 2)
     */
    attackFireBurst(maze) {
        const cells = [];
        const cy = this.y + 1;
        const cx = this.x + 1;
        const rows = this.gameConfig.rows;
        const cols = this.gameConfig.cols;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dy) + Math.abs(dx) !== 2) continue;
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (maze[ny][nx] === 1) continue;
                if (this.blockCovers(this.y, this.x, ny, nx)) continue;
                cells.push({ y: ny, x: nx });
            }
        }
        return cells;
    }

    /**
     * Столкновение с игроком: урон при неуязвимости (настройка), отброс, поражение
     */
    checkCollision(player, maze, enemies, getRandomPassable, hazards) {
        if (this.defeated) return null;
        if (!this.blockCovers(this.y, this.x, player.y, player.x)) return null;

        if (player.isInvincible()) {
            return this.applySwordHit(player, maze, enemies, getRandomPassable);
        }

        return { type: 'caught', message: this.getCatchMessage() };
    }

    /**
     * Удар мечом по боссу: HP -1, при 0 — повержен, иначе отброс блока
     * @returns {Object} {type, message}
     */
    applySwordHit(player, maze, enemies, getRandomPassable, avoidPos) {
        if (this.defeated) return null;

        // Улучшенный меч из магазина наносит 2 урона за взмах
        const dmg = (player && player.swordPlus) ? 2 : 1;
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.defeated = true;
            this.chase = false;
            this.searching = false;
            this.path = [];
            this.returnPath = [];
            this.wanderPath = [];
            this.pathGoal = null;
            return { type: 'bossDefeated', message: t('msg_boss_defeated') };
        }

        // Переход во 2-ю стадию (ярость) на половине HP
        if (this.hp <= Math.floor(this.maxHp / 2) && this.stage === 1) {
            this.stage = 2;
            const cell = this.getKnockbackCell(player, maze, enemies, avoidPos);
            this.y = cell.y;
            this.x = cell.x;
            this.resetStateBlock(maze);
            return { type: 'repelled', message: t('msg_boss_enraged', this.hp) };
        }

        // Отбрасываем блок не дальше 4 шагов (можно добить)
        const cell = this.getKnockbackCell(player, maze, enemies, avoidPos);
        this.y = cell.y;
        this.x = cell.x;
        this.resetStateBlock(maze);
        return { type: 'repelled', message: t('msg_boss_repelled_hp', this.hp) };
    }

    /**
     * Случайная проходимая позиция блока 2x2 в радиусе 4 (для отброса после удара).
     * Не возвращается на место удара и не накрывает игрока/клетку avoidPos
     * @param {Object} player - позиция игрока
     * @param {Object} [avoidPos] - дополнительная клетка, которую блок не должен накрывать
     */
    getKnockbackCell(player, maze, enemies, avoidPos) {
        const cells = [];
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (Math.abs(dy) + Math.abs(dx) > 4) continue;
                if (dy === 0 && dx === 0) continue; // не оставаться на месте удара
                const ny = this.y + dy;
                const nx = this.x + dx;
                if (!this.canPlace(ny, nx)) continue;
                if (this.blockCovers(ny, nx, player.y, player.x)) continue;
                if (avoidPos && this.blockCovers(ny, nx, avoidPos.y, avoidPos.x)) continue;
                if (enemies.find(e => e !== this && e.y >= ny && e.y <= ny + 1 && e.x >= nx && e.x <= nx + 1)) continue;
                cells.push({ y: ny, x: nx });
            }
        }
        if (cells.length === 0) {
            return { y: this.y, x: this.x };
        }
        return cells[Math.floor(Math.random() * cells.length)];
    }

    /**
     * Сброс состояния после отброса (возврат к новому дому)
     */
    resetStateBlock(maze) {
        this.chase = false;
        this.searching = false;
        this.returning = true;
        this.returnPath = this.blockBfs(this.y, this.x, this.homeY, this.homeX);
        this.pathGoal = null;
    }

    /**
     * Сообщение при поимке игрока боссом
     */
    getCatchMessage() {
        return t('msg_boss_catch');
    }
}
