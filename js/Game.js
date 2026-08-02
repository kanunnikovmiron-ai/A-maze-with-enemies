/**
 * Основной класс игры
 */

class Game {
    /**
     * @param {number} levelIndex - индекс уровня
     * @param {Object} settings - настройки игры
     */
    constructor(levelIndex, settings) {
        this.levelIndex = levelIndex;
        this.settings = settings;

        // Параметры секретных комнат
        this.SECRET_CHANCE = 0.10;      // 10% шанс появления секретного прохода
        if (settings.difficulty === 'hard') this.SECRET_CHANCE += 0.03; // +3% на сложной
        this.CRACK_LIGHT_RADIUS = 2;    // Радиус света из трещины
        this.secretAudio = null;        // Аудио-трек секретной комнаты
        this.bossAudio = null;          // Аудио-трек арены босса
        this.secret = null;             // Данные секретной комнаты (или null)
        this.boss = null;               // Босс последнего уровня (или null)
        this.inSecretRoom = false;      // Игрок сейчас в секретной комнате
        this.hazards = [];              // Опасные клетки (огонь) на босс-арене
        this.swingFlash = null;         // Клетка последнего взмаха мечом (анимация)

        // Загружаем уровень
        const level = LEVELS[levelIndex];
        this.maze = level.maze;
        this.rows = level.maze.length;
        this.cols = level.maze[0].length;

        // Последний уровень — арена босса
        this.isBossLevel = levelIndex === LEVELS.length - 1;

        // Создаем конфигурации
        this.playerConfig = new PlayerConfig(settings);
        this.enemyConfig = new EnemyConfig(settings);
        this.finishConfig = new FinishConfig(settings);
        this.keyConfig = new KeyConfig(settings);

        // Создаем игрока и финиш
        this.player = new Player(level.start.y, level.start.x, this.playerConfig);
        this.finish = { ...level.finish };

        // Создаем врагов
        this.enemies = this.spawnEnemies();

        // Создаем части ключа (если включены на этой сложности и не на арене босса)
        this.keys = [];
        this.keysCollected = 0;
        if (this.keyConfig.enabled && !this.isBossLevel) {
            this.keys = this.spawnKeys();
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
        this.message = this.getStartMessage(level);

        // Инициализируем отрисовку
        this.renderer = new Renderer(this);

        // Секретный проход (5% шанс)
        this.tryCreateSecret();

        // Музыка арены босса на последнем уровне
        if (this.isBossLevel) this.playBossMusic();
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

        // Арена босса: только босс, без обычных врагов и стражей
        if (this.isBossLevel) {
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
            enemies.push(boss);
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
     * Удаление врага из игры (например, убитого мечом)
     * @param {Object} enemy - враг
     */
    removeEnemy(enemy) {
        const idx = this.enemies.indexOf(enemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
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
        // В секретной комнате враги не двигаются
        if (this.inSecretRoom) return;

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
            } else {
                h.ttl--;
                if (h.ttl <= 0) {
                    this.hazards.splice(i, 1);
                }
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
        } else if (this.keyConfig.enabled && !this.hasAllKeys()) {
            this.message = `🔑 Соберите части ключа (${this.keysCollected}/${this.keys.length}). ${lockIcon}`;
        } else {
            this.message = this.isFinishLocked() ? '🔒 Финиш заблокирован!' : '🔓 Открыт!';
        }
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
     * Попытка создать секретный проход (10% шанс, +3% на сложной).
     * BFS от старта по проходимым клеткам, из соседних стен выбирается случайная
     */
    tryCreateSecret() {
        // На последнем уровне секретная комната гарантирована (нужен меч для босса)
        const chance = this.levelIndex === LEVELS.length - 1 ? 1 : this.SECRET_CHANCE;
        if (Math.random() >= chance) return;

        const rows = this.rows;
        const cols = this.cols;
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
                        wallCandidates.push({ y: ny, x: nx });
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
        this.secret = {
            entrance: wall,                    // Стена-проход в основном лабиринте
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
        if (this.isBossLevel) this.playBossMusic();
        return true;
    }
}