/**
 * Основной класс игры
 */

class Game {
    /**
     * @param {number} levelIndex - индекс уровня
     * @param {Object} settings - настройки игры
     * @param {Object} [levelObject] - объект уровня напрямую (превью из редактора)
     */
    constructor(levelIndex, settings, levelObject) {
        this.levelIndex = levelIndex;
        this.settings = settings;
        this.isPreview = !!levelObject;

        // Параметры секретных комнат
        this.SECRET_CHANCE = 0.10;      // 10% шанс появления секретного прохода
        if (settings.difficulty === 'hard') this.SECRET_CHANCE += 0.03; // +3% на сложной
        this.CRACK_LIGHT_RADIUS = 2;    // Радиус света из трещины
        this.secretAudio = null;        // Аудио-трек секретной комнаты
        this.bossAudio = null;          // Аудио-трек арены босса
        this.shopAudio = null;          // Аудио-трек магазина
        this.secretBossAudio = null;    // Аудио-трек арены секретного босса
        this.secret = null;             // Данные секретной комнаты (или null)
        this.boss = null;               // Босс последнего уровня (или null)
        this.inSecretRoom = false;      // Игрок сейчас в секретной комнате
        this.hazards = [];              // Опасные клетки (огонь) на босс-арене
        this.swingFlash = null;         // Клетка последнего взмаха мечом (анимация)
        this.secretBoss = null;         // Секретный босс — розовое сердце (или null)
        this.inSecretBossRoom = false;  // Игрок в арене секретного босса
        this.secretBossChance = 0.15;   // Шанс появления розовой трещины (15%)
        this.secretBossCoinsGranted = false; // +30 монет за первое поверженное сердце (арена или карта)
        this.mainEnemies = null;        // Враги основного лабиринта (на время арены)
        this.mainHazards = null;        // Опасности основного лабиринта (на время арены)

        // Загружаем уровень (из объекта превью или по индексу)
        const level = levelObject || resolveLevel(levelIndex);
        this.level = level;
        this.maze = level.maze;
        this.rows = level.maze.length;
        this.cols = level.maze[0].length;

        // Босс-уровень: флаг уровня, placement босса или последний встроенный
        const placements = level.placements || [];
        this.isBossLevel = level.bossLevel === true ||
            placements.some(p => p.type === 'boss') ||
            levelIndex === LEVELS.length - 1;

        // Создаем конфигурации
        this.playerConfig = new PlayerConfig(settings);
        this.enemyConfig = new EnemyConfig(settings);
        this.finishConfig = new FinishConfig(settings);
        this.keyConfig = new KeyConfig(settings);

        // Создаем игрока и финиш
        this.player = new Player(level.start.y, level.start.x, this.playerConfig, this.isBossLevel || level.tutorial === true);
        this.finish = { ...level.finish };

        // Бонусы из магазина (постоянные)
        this.applyShopBonuses();

        // Создаем врагов
        this.enemies = this.spawnEnemies();

        // Создаем части ключа: из placements редактора или процедурно
        this.keys = [];
        this.keysCollected = 0;
        const placedKeys = placements.filter(p => p.type === 'key');
        if (placedKeys.length > 0) {
            this.keys = placedKeys.map(p => ({ y: p.y, x: p.x, collected: false }));
            this.keyConfig.enabled = true;
        } else if (this.keyConfig.enabled && !this.isBossLevel) {
            this.keys = this.spawnKeys();
        }

        // Пикапы из placements редактора (меч, бафы)
        this.pickups = [];
        for (const p of placements) {
            if (p.type === 'sword' || p.type === 'buffHp' || p.type === 'buffInv') {
                this.pickups.push({ type: p.type, y: p.y, x: p.x, collected: false });
            }
        }

        // Туман войны (только на сложной сложности и не на арене босса)
        this.fogEnabled = settings.fog === 'yes' && !this.isBossLevel;
        this.fogVisionRadius = settings.fogVision || 4;
        this.explored = [];
        for (let y = 0; y < this.rows; y++) {
            this.explored[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.explored[y][x] = false;
            }
        }

        // Состояние игры
        this.gameOver = false;
        this.gameRunning = true;
        this.repelledThisTurn = false;
        this.pickedKeyThisTurn = false;
        this.coinsEarned = 0; // Монеты, заработанные за текущий уровень
        this.message = this.getStartMessage(level);

        // Инициализируем отрисовку
        this.renderer = new Renderer(this);

        // Секретный проход (5% шанс)
        this.tryCreateSecret();

        // Комната магазина (дверь на каждом уровне)
        this.buildShop();

        // Арена секретного босса (розовая трещина, шанс ~15%)
        this.buildSecretBoss();

        // Музыка: сердца на карте — музыка секретного босса, иначе музыка арены босса
        if (this.hasLiveSecretBoss()) {
            this.playSecretBossMusic();
        } else if (this.isBossLevel) {
            this.playBossMusic();
        }
    }

    /**
     * Применить постоянные бонусы магазина в начале уровня
     */
    applyShopBonuses() {
        if (typeof getShopBonuses !== 'function') return;
        // На учебном уровне магазинные бонусы не применяются (сохраняем обучение мечу)
        if (this.level.tutorial === true) return;
        const bonus = getShopBonuses();
        if (bonus.sword) this.player.giveSword();
        if (bonus.hpBonus > 0) {
            this.player.maxHp += bonus.hpBonus;
            this.player.hp = this.player.maxHp;
        }
        if (bonus.swordPlus) this.player.swordPlus = true;
    }

    /**
     * Начислить монеты игроку (не для превью из редактора)
     * @param {number} amount
     */
    grantCoins(amount) {
        if (this.isPreview || !amount || amount <= 0) return;
        if (typeof addCoins !== 'function') return;
        this.coinsEarned += amount;
        addCoins(amount);
    }

    /**
     * Получение всех проходимых клеток
     * @returns {Array} массив проходимых клеток
     */
    getAllPassable() {
        const cells = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] !== 1) {
                    cells.push({ y, x });
                }
            }
        }
        return cells;
    }

    /**
     * Получение случайной проходимой клетки
     * @param {Array} exclude - клетки для исключения
     * @returns {Object} {y, x}
     */
    getRandomPassable(exclude = []) {
        const all = this.getAllPassable();
        const available = all.filter(c =>
            !exclude.some(e => e.y === c.y && e.x === c.x)
        );
        return available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : all[0];
    }

    /**
     * Создание врагов (обычные + стражи)
     * @returns {Array} массив врагов
     */
    spawnEnemies() {
        const enemies = [];
        const exclude = [this.player, this.finish];

        // Уровень из редактора: точные placements врагов
        const placements = (this.level.placements || [])
            .filter(p => p.type === 'enemy' || p.type === 'patrol' || p.type === 'boss' || p.type === 'secretBoss');
        if (placements.length > 0) {
            const gc = { rows: this.rows, cols: this.cols, maze: this.maze };
            let ei = 1;
            let pi = 1;
            let hi = 1;
            for (const p of placements) {
                if (p.type === 'boss') {
                    const boss = new BossEnemy('B1', p.y, p.x, this.enemyConfig, gc);
                    this.boss = boss;
                    enemies.push(boss);
                } else if (p.type === 'patrol') {
                    enemies.push(new PatrolEnemy('P' + (pi++), p.y, p.x, this.enemyConfig, gc));
                } else if (p.type === 'secretBoss') {
                    enemies.push(new SecretBossEnemy('H' + (hi++), p.y, p.x, this.enemyConfig, gc));
                } else {
                    enemies.push(new Enemy('E' + (ei++), p.y, p.x, this.enemyConfig, gc));
                }
            }
            // Босс-уровень без placement босса: ставим процедурного
            if (this.isBossLevel && !this.boss) {
                enemies.push(this.spawnBoss());
            }
            return enemies;
        }

        // Арена босса: только босс, без обычных врагов и стражей
        if (this.isBossLevel) {
            enemies.push(this.spawnBoss());
            return enemies;
        }

        const totalEnemies = this.enemyConfig.count;

        // Определяем количество обычных врагов и стражей
        const patrolCount = Math.min(this.enemyConfig.patrolCount, totalEnemies); // Количество стражей (не больше общего)
        const normalCount = totalEnemies - patrolCount; // Оставшиеся - обычные враги

        // Создаем обычных врагов
        for (let i = 1; i <= normalCount; i++) {
            const pos = this.getRandomPassable(exclude);
            const enemy = new Enemy(
                `${this.enemyConfig.prefix}${i}`,
                pos.y,
                pos.x,
                this.enemyConfig,
                {
                    rows: this.rows,
                    cols: this.cols,
                    maze: this.maze
                }
            );
            enemies.push(enemy);
            exclude.push(enemy);
        }

        // Создаем патрульных врагов (стражи)
        for (let i = 1; i <= patrolCount; i++) {
            const pos = this.getRandomPassable(exclude);
            const patrolEnemy = new PatrolEnemy(
                `P${i}`,
                pos.y,
                pos.x,
                this.enemyConfig,
                {
                    rows: this.rows,
                    cols: this.cols,
                    maze: this.maze
                }
            );
            enemies.push(patrolEnemy);
            exclude.push(patrolEnemy);
        }

        return enemies;
    }

    /**
     * Процедурный спавн босса (когда его позиция не задана placements)
     * @returns {BossEnemy}
     */
    spawnBoss() {
        let pos = this.getBossSpawnPos();
        if (!pos) {
            // Крайний случай: без блока 2x2 ставим босса на первую проходимую клетку,
            // update() сам выправит позицию в безопасный блок
            const first = this.getAllPassable()[0];
            pos = {
                y: Math.max(0, Math.min(first.y, this.rows - 2)),
                x: Math.max(0, Math.min(first.x, this.cols - 2))
            };
        }
        const boss = new BossEnemy(
            'B1',
            pos.y,
            pos.x,
            this.enemyConfig,
            {
                rows: this.rows,
                cols: this.cols,
                maze: this.maze
            }
        );
        this.boss = boss;
        return boss;
    }

    /**
     * Удаление врага из игры (например, убитого мечом)
     * @param {Object} enemy - враг
     */
    removeEnemy(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
        // Награда за убийство врага (страж — больше)
        if (enemy && enemy.type) {
            const R = (typeof COIN_REWARDS !== 'undefined')
                ? COIN_REWARDS
                : { enemy: 5, patrol: 8, boss: 30, levelClear: 15 };
            const reward = (enemy.type === 'patrol') ? R.patrol : R.enemy;
            this.grantCoins(reward);
        }
    }

    /**
     * Позиция спавна босса: проходимая позиция блока 2x2 в 3-8 клетках от финиша
     * (все 4 клетки блока свободны и не накрывают финиш/игрока)
     * @returns {Object} {y, x} — левый-верхний угол блока
     */
    getBossSpawnPos() {
        const candidates = [];
        const all = this.getAllPassable();
        for (const cell of all) {
            if (cell.y === this.player.y && cell.x === this.player.x) continue;
            if (cell.y === this.finish.y && cell.x === this.finish.x) continue;
            if (cell.y + 1 >= this.rows || cell.x + 1 >= this.cols) continue;
            if (this.canPlaceBossBlock(cell.y, cell.x)) {
                const dist = Math.abs(cell.y - this.finish.y) + Math.abs(cell.x - this.finish.x);
                if (dist >= 3 && dist <= 8) {
                    candidates.push(cell);
                }
            }
        }
        if (candidates.length === 0) {
            // Запасной вариант: любой проходимый блок (не накрывает игрока/финиш),
            // либо null, если таких вообще нет — обработка в spawnEnemies
            return this.getAllPassable().find(c => this.canPlaceBossBlock(c.y, c.x)) || null;
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * Проходим ли блок 2x2 (не накрывает финиш и игрока)
     * @param {number} y - верхняя строка блока
     * @param {number} x - левый столбец блока
     * @returns {boolean}
     */
    canPlaceBossBlock(y, x) {
        if (y < 0 || x < 0 || y + 1 >= this.rows || x + 1 >= this.cols) return false;
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (this.maze[ny][nx] !== 0) return false;
                if (ny === this.finish.y && nx === this.finish.x) return false;
                if (ny === this.player.y && nx === this.player.x) return false;
            }
        }
        return true;
    }

    /**
     * Проверка, есть ли агрессивные враги
     * @returns {boolean}
     */
    isAnyAggressive() {
        return this.enemies.some(e =>
            e.chase || e.searching || (e.loseCount > 0 && !e.returning)
        );
    }

    /**
     * Создание частей ключа на случайных проходимых клетках
     * (исключая старт, финиш и клетки врагов)
     * @returns {Array} массив частей ключа
     */
    spawnKeys() {
        const exclude = [this.player, this.finish, ...this.enemies];
        const keys = [];
        for (let i = 0; i < this.keyConfig.count; i++) {
            const pos = this.getRandomPassable(exclude);
            keys.push({ y: pos.y, x: pos.x, collected: false });
            exclude.push(keys[keys.length - 1]);
        }
        return keys;
    }

    /**
     * Собраны ли все части ключа
     * @returns {boolean}
     */
    hasAllKeys() {
        if (this.keys.length === 0) return true;
        return this.keys.every(k => k.collected);
    }

    /**
     * Заблокирован ли финиш (нужны ключи или идёт погоня)
     * @returns {boolean}
     */
    isFinishLocked() {
        if (this.boss && !this.boss.defeated) return true;
        if (this.finishConfig.lockWhenChased && this.isAnyAggressive()) return true;
        if (this.keyConfig.enabled && !this.hasAllKeys()) return true;
        return false;
    }

    /**
     * Обновление всех врагов
     */
    updateEnemies() {
        // В секретной комнате и в магазине враги не двигаются
        if (this.inSecretRoom || this.inShopRoom) return;

        // Тикаем опасные клетки (предупреждения -> огонь, огонь тает)
        this.tickHazards();

        for (const enemy of this.enemies) {
            const result = enemy.update(
                this.player,
                this.maze,
                this.enemies,
                (exclude) => this.getRandomPassable(exclude),
                this.hazards
            );

            if (result && result.type === 'caught') {
                // Защита от двойного урона за ход: если игрок уже пострадал
                // (от столкновения/огня при ходе), отбрасываем врага без урона
                if (this.player.hurtThisTurn) {
                    if (enemy.type === 'boss') {
                        const cell = enemy.getKnockbackCell(this.player, this.maze, this.enemies);
                        enemy.y = cell.y;
                        enemy.x = cell.x;
                        enemy.resetStateBlock(this.maze);
                    } else {
                        const cell = this.getRandomPassable([this.player, ...this.enemies.filter(e => e !== enemy)]);
                        enemy.y = cell.y;
                        enemy.x = cell.x;
                        enemy.resetState(this.maze);
                    }
                    this.repelledThisTurn = true;
                    break;
                }
                // Игрок пойман: -1 HP, второе попадание — поражение
                const dead = this.player.takeDamage(this, result.message);
                if (dead) break;
                // Выжили: отбрасываем врага от игрока
                if (enemy.type === 'boss') {
                    const cell = enemy.getKnockbackCell(this.player, this.maze, this.enemies);
                    enemy.y = cell.y;
                    enemy.x = cell.x;
                    enemy.resetStateBlock(this.maze);
                } else {
                    const cell = this.getRandomPassable([this.player, ...this.enemies.filter(e => e !== enemy)]);
                    enemy.y = cell.y;
                    enemy.x = cell.x;
                    enemy.homeY = cell.y;
                    enemy.homeX = cell.x;
                    enemy.resetState(this.maze);
                }
                this.repelledThisTurn = true;
                break;
            } else if (result && result.type === 'repelled') {
                this.message = result.message;
                this.repelledThisTurn = true;
            } else if (result && result.type === 'bossDefeated') {
                this.message = result.message;
                this.repelledThisTurn = true;
                const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { boss: 30 };
                this.grantCoins(R.boss);
            }
        }
    }

    /**
     * Тиканье опасных клеток: предупреждение становится огнём, огонь догорает
     */
    tickHazards() {
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            if (h.phase === 'warn') {
                h.phase = 'fire';
                h.ttl = 1;
                // Взрыв бомбы плюсом: добавляем огонь по 4 ортогональным соседям
                if (h.bomb) {
                    this.explodeBomb(h);
                }
            } else {
                h.ttl--;
                if (h.ttl <= 0) {
                    this.hazards.splice(i, 1);
                }
            }
        }
    }

    /**
     * Взрыв бомбы крестом до границы/стены: поджигает центр и весь луч
     * в 4 ортогональных направлениях, пока не упрётся в стену или край карты.
     * @param {Object} h - детонировавшая бомба (центр взрыва)
     */
    explodeBomb(h) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dy, dx] of dirs) {
            let step = 1;
            while (true) {
                const ny = h.y + dy * step;
                const nx = h.x + dx * step;
                if (ny < 0 || ny >= this.rows || nx < 0 || nx >= this.cols) break;
                if (this.maze[ny][nx] === 1) break; // Луч останавливает стена
                if (!this.hazards.some(x => x.y === ny && x.x === nx)) {
                    this.hazards.push({ y: ny, x: nx, phase: 'fire', ttl: 1, bomb: true });
                }
                step++;
            }
        }
    }

    /**
     * Обновление статусного сообщения
     */
    updateStatusMessage() {
        const chasing = this.enemies.filter(e => e.chase);
        const searching = this.enemies.filter(e => e.searching);
        const waiting = this.enemies.filter(e => e.loseCount > 0 && !e.returning);

        const keyInfo = this.keyConfig.enabled && this.keys.length > 0
            ? `🔑 ${this.keysCollected}/${this.keys.length}`
            : '';

        // Финиш заблокирован, если не собраны ключи или идёт погоня
        const lockIcon = this.isFinishLocked() ? '🔒' : '🔓';

        if (chasing.length > 0) {
            this.message = `⚠️ Видят! ${lockIcon} ${keyInfo}`.trim();
        } else if (searching.length > 0) {
            this.message = `🔍 Ищут. ${lockIcon} ${keyInfo}`.trim();
        } else if (waiting.length > 0) {
            const maxWait = Math.max(...waiting.map(e => e.loseCount));
            this.message = `⏳ Ждут (${maxWait}/${this.enemyConfig.agroLimit}). ${lockIcon} ${keyInfo}`.trim();
        } else if (this.level.tutorial) {
            this.message = this.tutorialHint();
        } else if (this.keyConfig.enabled && !this.hasAllKeys()) {
            this.message = `🔑 Соберите части ключа (${this.keysCollected}/${this.keys.length}). ${lockIcon}`;
        } else {
            this.message = this.isFinishLocked() ? '🔒 Финиш заблокирован!' : '🔓 Открыт!';
        }
    }

    /**
     * Пошаговая подсказка для обучающего уровня
     * @returns {string}
     */
    tutorialHint() {
        const lockIcon = this.isFinishLocked() ? '🔒' : '🔓';
        if (this.keyConfig.enabled && !this.hasAllKeys()) {
            return `🔑 Соберите обе части ключа (${this.keysCollected}/${this.keys.length}). ${lockIcon}`;
        }
        if (!this.player.hasSword) {
            return `🗝 Найдите трещину в стене — за ней ⚔ меч. ${lockIcon}`;
        }
        if (this.enemies.length > 0) {
            return '⚔ Бейте врагов Пробелом!';
        }
        return '🏁 Идите к финишу!';
    }

    /**
     * Получение стартового сообщения
     * @param {Object} level - объект уровня
     * @returns {string}
     */
    getStartMessage(level) {
        let msg = `🗺 Уровень ${this.levelIndex + 1}: "${level.name}".`;
        if (this.keyConfig.enabled && this.keys.length > 0) {
            msg += ` 🔑 Соберите ${this.keyConfig.count} части ключа, чтобы открыть финиш.`;
        } else if (this.finishConfig.lockWhenChased) {
            msg += ' 🔒 Финиш заблокирован при погоне.';
        }
        if (this.fogEnabled) {
            msg += ' 🌫 Туман войны: исследуйте карту.';
        }
        if (this.playerConfig.invincible) {
            msg = '🛡 Неуязвимость. ' + msg;
        }
        if (level.tutorial) {
            msg += ' 📖 Соберите 🔑 ключи, найдите 🗝 трещину в стене, возьмите ⚔ меч, победите врагов и дойдите до финиша.';
        }
        return msg;
    }

    /**
     * Генерация лабиринта секретной комнаты (15x15) рекурсивным бэктрекером.
     * Границы — стены, внутри связный лабиринт (путь до любой клетки гарантирован).
     * @returns {Array} массив 15x15: 1 — стена, 0 — проход
     */
    generateSecretMaze() {
        const size = 15;
        const maze = Array.from({ length: size }, () => Array(size).fill(1));

        // Рекурсивный бэктрекер с явным стеком
        const stack = [{ y: 1, x: 1 }];
        maze[1][1] = 0;

        while (stack.length > 0) {
            const cur = stack[stack.length - 1];
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            const candidates = [];

            for (const [dy, dx] of dirs) {
                const ny = cur.y + dy * 2;
                const nx = cur.x + dx * 2;
                if (ny < 1 || ny >= size - 1 || nx < 1 || nx >= size - 1) continue;
                if (maze[ny][nx] !== 1) continue;
                candidates.push({ ny, nx, my: cur.y + dy, mx: cur.x + dx });
            }

            if (candidates.length === 0) {
                stack.pop();
                continue;
            }

            const next = candidates[Math.floor(Math.random() * candidates.length)];
            maze[next.my][next.mx] = 0;
            maze[next.ny][next.nx] = 0;
            stack.push({ y: next.ny, x: next.nx });
        }

        return maze;
    }

    /**
     * Построение комнаты магазина с дверью-порталом на каждом уровне.
     * Дверь — случайная внутренняя стена, достижимая от старта.
     */
    buildShop() {
        const rows = this.rows;
        const cols = this.cols;

        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const queue = [{ y: this.player.y, x: this.player.x }];
        visited[this.player.y][this.player.x] = true;
        const wallCandidates = [];

        while (queue.length > 0) {
            const cur = queue.shift();
            for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (this.maze[ny][nx] === 1) {
                    if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                        // Не совпадает с входом в секретную комнату
                        const isSecretEntrance = this.secret && this.secret.entrance.y === ny && this.secret.entrance.x === nx;
                        const isBossEntrance = this.level.secretBossEntrance &&
                            this.level.secretBossEntrance.y === ny && this.level.secretBossEntrance.x === nx;
                        if (!isSecretEntrance && !isBossEntrance) {
                            wallCandidates.push({ y: ny, x: nx });
                        }
                    }
                } else if (!visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push({ y: ny, x: nx });
                }
            }
        }

        if (wallCandidates.length === 0) return;

        const wall = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
        this.shop = this.buildShopRoom(wall.y, wall.x);
    }

    /**
     * Построение данных комнаты магазина (порталы и пьедесталы с товарами)
     * @param {number} wy - строка двери-прохода
     * @param {number} wx - столбец двери-прохода
     * @returns {Object}
     */
    buildShopRoom(wy, wx) {
        // Открытая комната 10x10 без лабиринта (по краям стены)
        const roomMaze = this.generateShopMaze();

        // 3 пьедестала: колонна, напрямую достижима от входа (1,1)
        const pedestals = [
            { itemId: 'sword',     y: 2, x: 3 },
            { itemId: 'hpBonus',   y: 4, x: 3 },
            { itemId: 'swordPlus', y: 6, x: 3 }
        ];
        // Гарантируем проходимость клеток пьедесталов
        for (const p of pedestals) {
            roomMaze[p.y][p.x] = 0;
        }

        return {
            entrance: { y: wy, x: wx },   // Дверь-проход в основном лабиринте
            roomMaze: roomMaze,           // Открытая комната (10x10)
            entryPos: { y: 1, x: 1 },     // Вход и выход-портал (гарантированно проходимый)
            pedestals: pedestals,         // Пьедесталы с товарами
            used: false                   // Магазин посещён
        };
    }

    /**
     * Генерация открытой комнаты магазина 10x10: пол везде, по краям стены
     * @returns {Array} массив 10x10: 1 — стена, 0 — проход
     */
    generateShopMaze() {
        const size = 10;
        const maze = Array.from({ length: size }, () => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            maze[0][i] = 1;
            maze[size - 1][i] = 1;
            maze[i][0] = 1;
            maze[i][size - 1] = 1;
        }
        return maze;
    }

    /**
     * Вход в комнату магазина
     */
    enterShopRoom() {
        if (!this.shop || this.inShopRoom || this.inSecretRoom) return false;

        this.mainMaze = this.maze;
        this.mainRows = this.rows;
        this.mainCols = this.cols;
        this.shop.back = { y: this.player.y, x: this.player.x };

        this.maze = this.shop.roomMaze;
        this.rows = this.shop.roomMaze.length;
        this.cols = this.shop.roomMaze[0].length;
        this.player.y = this.shop.entryPos.y;
        this.player.x = this.shop.entryPos.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inShopRoom = true;

        this.message = '🛒 Магазин! Подойдите к пьедесталу, чтобы купить.';
        this.stopBossMusic();
        this.stopSecretBossMusic();
        this.playShopMusic();
        return true;
    }

    /**
     * Выход из комнаты магазина
     */
    exitShopRoom() {
        if (!this.inShopRoom) return false;

        this.maze = this.mainMaze;
        this.rows = this.mainRows;
        this.cols = this.mainCols;
        this.player.y = this.shop.back.y;
        this.player.x = this.shop.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inShopRoom = false;

        this.message = 'Выход из магазина.';
        this.stopShopMusic();
        this.resumeLevelMusic();
        return true;
    }

    /**
     * Попытка создать арену секретного босса (розовая трещина, шанс ~15%).
     * На «Обучении» не появляется. Трещина — достижимая внутренняя стена,
     * не совпадающая со входами секретной комнаты и магазина.
     */
    buildSecretBoss() {
        // На учебном уровне секретный босс не появляется
        if (this.level.tutorial === true) return;
        if (this.secretBoss) return;

        // Явный вход из редактора (трещина на внутренней стене) — гарантирован
        const sbEntrance = this.level.secretBossEntrance;
        if (sbEntrance && sbEntrance.y > 0 && sbEntrance.y < this.rows - 1 &&
            sbEntrance.x > 0 && sbEntrance.x < this.cols - 1 &&
            this.maze[sbEntrance.y] && this.maze[sbEntrance.y][sbEntrance.x] === 1) {
            this.secretBoss = {
                entrance: { y: sbEntrance.y, x: sbEntrance.x },
                entryPos: { y: 1, x: 1 },
                defeated: false,
                hp: 10
            };
            return;
        }

        // Случайный вход с шансом ~15%
        if (Math.random() >= this.secretBossChance) return;

        const rows = this.rows;
        const cols = this.cols;

        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const queue = [{ y: this.player.y, x: this.player.x }];
        visited[this.player.y][this.player.x] = true;
        const wallCandidates = [];

        while (queue.length > 0) {
            const cur = queue.shift();
            for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
                if (this.maze[ny][nx] === 1) {
                    if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                        if (!(this.secret && this.secret.entrance.y === ny && this.secret.entrance.x === nx) &&
                            !(this.shop && this.shop.entrance.y === ny && this.shop.entrance.x === nx)) {
                            wallCandidates.push({ y: ny, x: nx });
                        }
                    }
                } else if (!visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push({ y: ny, x: nx });
                }
            }
        }

        if (wallCandidates.length === 0) return;

        const wall = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
        this.secretBoss = {
            entrance: { y: wall.y, x: wall.x },   // Розовая трещина в стене
            entryPos: { y: 1, x: 1 },             // Вход и выход-портал в арене
            defeated: false,                      // Сердце ещё живо
            hp: 10                                // Текущее HP сердца (сохраняется между входами)
        };
    }

    /**
     * Вход в арену секретного босса
     */
    enterSecretBossRoom() {
        if (!this.secretBoss || this.inSecretBossRoom || this.inShopRoom || this.inSecretRoom) return false;

        this.mainMaze = this.maze;
        this.mainRows = this.rows;
        this.mainCols = this.cols;
        this.mainEnemies = this.enemies;
        this.mainHazards = this.hazards;
        this.secretBoss.back = { y: this.player.y, x: this.player.x };

        // Арена 15x15 — открытое пространство с бортиком
        this.maze = this.generateSecretBossMaze();
        this.rows = this.maze.length;
        this.cols = this.maze[0].length;
        this.hazards = [];
        this.player.y = this.secretBoss.entryPos.y;
        this.player.x = this.secretBoss.entryPos.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;

        // Боевые HP в арене: обычно уровни дают игроку 1 HP, чего мало для босса.
        // Запоминаем состояние до входа и воспринимаем до max(3, текущее), затем восстанавливаем.
        this.secretBoss.hpBackup = { maxHp: this.player.maxHp, hp: this.player.hp };
        this.player.maxHp = Math.max(3, this.player.maxHp);
        this.player.hp = this.player.maxHp;

        // Сердце в центре арены (с сохранённым прогрессом HP, если не повержено)
        if (!this.secretBoss.defeated) {
            const heart = new SecretBossEnemy('H1', 7, 7, this.enemyConfig, {
                rows: this.rows,
                cols: this.cols,
                maze: this.maze
            });
            heart.hp = this.secretBoss.hp;
            heart.maxHp = 10;
            this.enemies = [heart];
        } else {
            this.enemies = [];
        }
        this.inSecretBossRoom = true;

        this.message = this.secretBoss.defeated
            ? '💖 Секретный босс уже повержен. Выход — через трещину.'
            : '💖 Секретный босс! Одолейте розовое сердце и получите 30 монет!';
        this.stopBossMusic();
        this.playSecretBossMusic();
        return true;
    }

    /**
     * Выход из арены секретного босса (через портал у входа)
     */
    exitSecretBossRoom() {
        if (!this.inSecretBossRoom) return false;

        this.maze = this.mainMaze;
        this.rows = this.mainRows;
        this.cols = this.mainCols;
        this.enemies = this.mainEnemies;
        this.hazards = this.mainHazards;
        this.player.y = this.secretBoss.back.y;
        this.player.x = this.secretBoss.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inSecretBossRoom = false;

        // Восстанавливаем исходное HP игрока после арены
        if (this.secretBoss.hpBackup) {
            this.player.maxHp = this.secretBoss.hpBackup.maxHp;
            this.player.hp = this.secretBoss.hpBackup.hp;
            delete this.secretBoss.hpBackup;
        }

        this.message = 'Выход из арены секретного босса.';
        this.stopSecretBossMusic();
        this.resumeLevelMusic();
        return true;
    }

    /**
     * Генерация арены секретного босса 15x15: пол везде, по краям стены
     * @returns {Array} массив 15x15: 1 — стена, 0 — проход
     */
    generateSecretBossMaze() {
        const size = 15;
        const maze = Array.from({ length: size }, () => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            maze[0][i] = 1;
            maze[size - 1][i] = 1;
            maze[i][0] = 1;
            maze[i][size - 1] = 1;
        }
        return maze;
    }

    /**
     * Попытка купить товар на пьедестале внутри комнаты магазина
     * @param {string} itemId
     */
    buyOnPedestal(itemId) {
        const res = buyItem(itemId);
        if (res.ok) {
            this.message = `✅ Куплено: ${res.item.icon} ${res.item.name}! (баланс: ${getWallet()} 🪙)`;
        } else {
            this.message = '❌ ' + res.reason;
        }
        return res.ok;
    }

    /**
     * Попытка создать секретный проход (10% шанс, +3% на сложной).
     * На босс-уровне секретная комната гарантирована (нужен меч для боя).
     * Если в placements редактора задан вход (secretEntrance) — комната строится там.
     */
    tryCreateSecret() {
        const rows = this.rows;
        const cols = this.cols;

        // Явный вход из редактора: трещина на внутренней стене
        const se = this.level.secretEntrance;
        if (se && se.y > 0 && se.y < rows - 1 && se.x > 0 && se.x < cols - 1 &&
            this.maze[se.y] && this.maze[se.y][se.x] === 1) {
            this.secret = this.buildSecretRoom(se.y, se.x);
            return;
        }

        const chance = (this.isBossLevel || this.level.tutorial === true) ? 1 : this.SECRET_CHANCE;
        if (Math.random() >= chance) return;

        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const queue = [{ y: this.player.y, x: this.player.x }];
        visited[this.player.y][this.player.x] = true;

        // Соседние стены достижимых клеток
        const wallCandidates = [];

        while (queue.length > 0) {
            const cur = queue.shift();
            for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;
                if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;

                if (this.maze[ny][nx] === 1) {
                    // Стена по краю лабиринта не годится
                    if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                        const isBossEntrance = this.level.secretBossEntrance &&
                            this.level.secretBossEntrance.y === ny && this.level.secretBossEntrance.x === nx;
                        if (!isBossEntrance) {
                            wallCandidates.push({ y: ny, x: nx });
                        }
                    }
                } else if (!visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push({ y: ny, x: nx });
                }
            }
        }

        if (wallCandidates.length === 0) return;

        // Выбираем случайную стену-проход
        const wall = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
        this.secret = this.buildSecretRoom(wall.y, wall.x);
    }

    /**
     * Построение секретной комнаты с входом-трещиной в стене
     * @param {number} wy - строка стены-прохода
     * @param {number} wx - столбец стены-прохода
     * @returns {Object} данные секретной комнаты
     */
    buildSecretRoom(wy, wx) {
        // Генерируем лабиринт комнаты и случайные огоньки (4-5 шт.) на проходимых клетках
        const roomMaze = this.generateSecretMaze();
        const lights = [];
        const count = 4 + Math.floor(Math.random() * 2); // 4-5 огоньков
        const passable = [];
        for (let y = 1; y < roomMaze.length - 1; y++) {
            for (let x = 1; x < roomMaze[0].length - 1; x++) {
                if (roomMaze[y][x] !== 1 && !(y === 1 && x === 1) && !(y === 13 && x === 13)) {
                    passable.push({ y, x });
                }
            }
        }
        for (let i = 0; i < count && passable.length > 0; i++) {
            const idx = Math.floor(Math.random() * passable.length);
            lights.push(passable.splice(idx, 1)[0]);
        }

        // В секретной комнате: вход (портал) сверху-слева, бонус справа-снизу
        return {
            entrance: { y: wy, x: wx },        // Стена-проход в основном лабиринте
            roomMaze: roomMaze,                // Лабиринт комнаты (15x15)
            entryPos: { y: 1, x: 1 },          // Где появляется игрок в комнате (портал)
            pickupPos: { y: 13, x: 13 },       // Где лежит бонус — меч
            light: { y: 1, x: 1 },             // Источник света (клетка перед входом)
            lights: lights,                    // Огоньки, освещающие комнату
            used: false                        // Комната уже посещена
        };
    }

    /**
     * Вход в секретную комнату
     */
    enterSecretRoom() {
        if (!this.secret || this.secret.used || this.inSecretRoom) return false;

        // Запоминаем текущее состояние основного лабиринта
        this.mainMaze = this.maze;
        this.mainRows = this.rows;
        this.mainCols = this.cols;
        this.secret.back = { y: this.player.y, x: this.player.x };

        // Переключаемся на комнату
        this.maze = this.secret.roomMaze;
        this.rows = this.secret.roomMaze.length;
        this.cols = this.secret.roomMaze[0].length;
        this.player.y = this.secret.entryPos.y;
        this.player.x = this.secret.entryPos.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inSecretRoom = true;

        this.message = '🗝 Секретная комната! Возьмите ⚔ меч или вернитесь через портал.';
        this.stopBossMusic();
        this.stopSecretBossMusic();
        this.playSecretMusic();
        return true;
    }

    /**
     * Включить музыку арены босса (зацикленно)
     */
    playBossMusic() {
        try {
            if (!this.bossAudio) {
                this.bossAudio = new Audio('audio/Toby_Fox_-_Black_Knife_(SkySound7.com).mp3');
                this.bossAudio.loop = true;
                this.bossAudio.volume = 0.4;
            }
            this.bossAudio.currentTime = 0;
            const p = this.bossAudio.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Остановить музыку арены босса
     */
    stopBossMusic() {
        try {
            if (this.bossAudio) {
                this.bossAudio.pause();
                this.bossAudio.currentTime = 0;
            }
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Включить музыку магазина (зацикленно)
     */
    playShopMusic() {
        try {
            if (!this.shopAudio) {
                this.shopAudio = new Audio('audio/Ridiculon_-_Murmur_of_the_Harvestman_Store_(eu.monfons.com).mp3');
                this.shopAudio.loop = true;
                this.shopAudio.volume = 0.4;
            }
            this.shopAudio.currentTime = 0;
            const p = this.shopAudio.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Остановить музыку магазина
     */
    stopShopMusic() {
        try {
            if (this.shopAudio) {
                this.shopAudio.pause();
                this.shopAudio.currentTime = 0;
            }
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Включить музыку секретной комнаты (зацикленно)
     */
    playSecretMusic() {
        try {
            if (!this.secretAudio) {
                this.secretAudio = new Audio('audio/Masters_of_Sound_-_Dialtone_From_Deltarune_Chapter_2_81621198.mp3');
                this.secretAudio.loop = true;
                this.secretAudio.volume = 0.4;
            }
            this.secretAudio.currentTime = 0;
            const p = this.secretAudio.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Есть ли живое сердце секретного босса на карте
     */
    hasLiveSecretBoss() {
        return this.enemies.some(e => e.type === 'secretBoss' && !e.defeated);
    }

    /**
     * Музыка текущего уровня после выхода из комнат: сердце на карте — музыка
     * секретного босса, иначе музыка арены босса (на босс-уровне).
     */
    resumeLevelMusic() {
        if (this.inSecretBossRoom) return;
        if (this.hasLiveSecretBoss()) {
            this.stopBossMusic();
            this.playSecretBossMusic();
        } else {
            this.stopSecretBossMusic();
            if (this.isBossLevel) this.playBossMusic();
        }
    }

    /**
     * Включить музыку арены секретного босса (зацикленно)
     */
    playSecretBossMusic() {
        try {
            if (!this.secretBossAudio) {
                this.secretBossAudio = new Audio('audio/Toby_Fox_Camellia_Official_-_32._Cutie_Mew_Mew_Magic_DELTARUNE_Chapter_5_Soundtrack_-_Toby_Fox_(SkySound7.com).mp3');
                this.secretBossAudio.loop = true;
                this.secretBossAudio.volume = 0.4;
            }
            this.secretBossAudio.currentTime = 0;
            const p = this.secretBossAudio.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Остановить музыку арены секретного босса
     */
    stopSecretBossMusic() {
        try {
            if (this.secretBossAudio) {
                this.secretBossAudio.pause();
                this.secretBossAudio.currentTime = 0;
            }
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Остановить музыку секретной комнаты
     */
    stopSecretMusic() {
        try {
            if (this.secretAudio) {
                this.secretAudio.pause();
                this.secretAudio.currentTime = 0;
            }
        } catch (e) { /* аудио не должно ломать игру */ }
    }

    /**
     * Выход из секретной комнаты
     * @param {boolean} picked - забрал ли игрок бонус
     */
    exitSecretRoom(picked) {
        if (!this.inSecretRoom) return false;

        // Восстанавливаем основной лабиринт
        this.maze = this.mainMaze;
        this.rows = this.mainRows;
        this.cols = this.mainCols;
        this.player.y = this.secret.back.y;
        this.player.x = this.secret.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inSecretRoom = false;

        if (picked) {
            // Комната "использована" только после подбора меча:
            // иначе на уровне босса выход без меча навсегда блокировал бы вход (софтлок)
            this.secret.used = true;
            this.player.giveSword();
            this.message = '⚔ Вы взяли меч! Теперь Пробел — взмах по врагам.';
        } else {
            this.message = 'Выход из секретной комнаты.';
        }
        this.stopSecretMusic();
        this.resumeLevelMusic();
        return true;
    }
}