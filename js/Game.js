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
        this.inShopRoom = false;        // Игрок сейчас в магазине
        this.shop = null;               // Данные магазина (или null)
        this.hazards = [];              // Опасные клетки (огонь) на босс-арене
        this.projectiles = [];          // Снаряды (стрелы лука)
        this.swingFlash = null;         // Клетка последнего взмаха мечом (анимация)
        this.secretBoss = null;         // Секретный босс — розовое сердце (или null)
        this.inSecretBossRoom = false;  // Игрок в арене секретного босса
        this.secretBossChance = 0.15;   // Шанс появления розовой трещины (15%)
        this.secretBossCoinsGranted = false; // +30 монет за первое поверженное сердце (арена или карта)
        this.mainEnemies = null;        // Враги основного лабиринта (на время арены)
        this.mainHazards = null;        // Опасности основного лабиринта (на время арены)
        this.mainBoss = null;           // Босс основного лабиринта (на время арены)
        this.shopConfirmPending = false; // Ожидание подтверждения покупки в магазине

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
        // Стартовое HP зависит от сложности
        if (settings.startHp) {
            this.player.maxHp = settings.startHp;
            this.player.hp = settings.startHp;
        }
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
            if (p.type === 'sword' || p.type === 'buffHp' || p.type === 'buffInv' || p.type === 'bow') {
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
        this.repelledUntil = 0;        // Timestamp до которого действует защита от двойного удара
        this.pickedKeyThisTurn = false;
        this._lastTickWorldTime = 0;   // Защита от двойного tickWorld() в одном кадре
        this.coinsEarned = 0; // Монеты, заработанные за текущий уровень
        this.moves = 0;       // Количество ходов игрока
        this.levelHits = 0;   // Количество полученных ударов за уровень
        this.message = this.getStartMessage(level);

        // Инициализируем отрисовку
        this.renderer = new Renderer(this);

        // Секретный проход (5% шанс)
        this.tryCreateSecret();

        // Комната магазина — НЕ на уровнях с секретной комнатой (кроме обучения)
        if (!this.secret || this.level.tutorial === true) {
            this.buildShop();
        }

        // Дверь магазина всегда видна через туман
        if (this.shop && this.fogEnabled) {
            const ey = this.shop.entrance.y, ex = this.shop.entrance.x;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const ny = ey + dy, nx = ex + dx;
                    if (ny >= 0 && ny < this.rows && nx >= 0 && nx < this.cols) {
                        this.explored[ny][nx] = true;
                    }
                }
            }
        }

        // Арена секретного босса (розовая трещина, шанс ~15%)
        this.buildSecretBoss();

        // Игровой цикл: враги двигаются независимо от игрока (запускается из initGame)
        this._loopTimer = null;

        // Музыка: сердца на карте — музыка секретного босса, иначе музыка арены босса
        if (this.hasLiveSecretBoss()) {
            this.playSecretBossMusic();
            if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
        } else if (this.isBossLevel) {
            this.playBossMusic();
            if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
        } else {
            if (typeof playLevelMusic === 'function') playLevelMusic();
        }
    }

    /**
     * Применить постоянные бонусы магазина в начале уровня
     */
    applyShopBonuses() {
        if (typeof getShopBonuses !== 'function') return;
        const bonus = getShopBonuses();
        if (bonus.sword) this.player.giveSword();
        if (bonus.hpBonus > 0) {
            this.player.maxHp += bonus.hpBonus;
            this.player.hp = this.player.maxHp;
        }
        if (bonus.swordPlus) this.player.swordPlus = true;
        if (bonus.bow) this.player.giveBow();
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
        if (typeof updateStat === 'function') { updateStat('coinsEver', amount); checkAchievements(); }
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
        if (all.length === 0) return null;
        const available = all.filter(c =>
            !exclude.some(e => e.y === c.y && e.x === c.x)
        );
        return available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : all[Math.floor(Math.random() * all.length)];
    }

    /**
     * Отметить уровень пройденным: открывает следующий по очереди.
     * Превью из редактора прогресс не сохраняет.
     */
    markLevelCompleted() {
        if (this.isPreview) return;
        if (typeof setMaxUnlocked === 'function') setMaxUnlocked(this.levelIndex + 1);
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
            const passable = this.getAllPassable();
            if (passable.length === 0) return null;
            const first = passable[0];
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
                : { enemy: 3, patrol: 5, boss: 30, levelClear: 10 };
            const reward = (enemy.type === 'patrol') ? R.patrol : R.enemy;
            this.grantCoins(reward);
        }
        if (typeof updateStat === 'function') { updateStat('totalKills', 1); checkAchievements(); }
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
     * Обновление состояния мира (опасности, снаряды) — вызывается после действий игрока
     */
    tickWorld() {
        if (this.inSecretRoom || this.inShopRoom) return;
        const now = Date.now();
        if (now - this._lastTickWorldTime < 100) return; // защита от двойного тика
        this._lastTickWorldTime = now;
        this.tickHazards();
        this.updateProjectiles();
    }

    /**
     * Обновление всех врагов
     */
    updateEnemies() {
        // В секретной комнате и в магазине враги не двигаются
        if (this.inSecretRoom || this.inShopRoom) return;

        // Огонь бомб бьёт обычных врагов и стражей (до тика — огонь ttl=1 ещё на карте)
        const burned = this.enemies.filter(e =>
            (e.type === 'enemy' || e.type === 'patrol') &&
            this.hazards.some(h => h.phase === 'fire' && h.y === e.y && h.x === e.x)
        );
        for (const e of burned) this.removeEnemy(e);

        for (const enemy of this.enemies) {
            const result = enemy.update(
                this.player,
                this.maze,
                this.enemies,
                (exclude) => this.getRandomPassable(exclude),
                this.hazards
            );

            if (result && result.type === 'caught') {
                // Защита от двойного урона: если игрок уже пострадал недавно, отбрасываем врага без урона
                if (this.player.hurtUntil > Date.now() || this.player.hurtThisTurn) {
                    if (enemy.type === 'boss') {
                        const cell = enemy.getKnockbackCell(this.player, this.maze, this.enemies);
                        if (cell) {
                            enemy.y = cell.y;
                            enemy.x = cell.x;
                            enemy.resetStateBlock(this.maze);
                        }
                    } else {
                        const cell = this.getRandomPassable([this.player, ...this.enemies.filter(e => e !== enemy)]);
                        if (cell) {
                            enemy.y = cell.y;
                            enemy.x = cell.x;
                            enemy.resetState(this.maze);
                        }
                    }
                    this.repelledUntil = Date.now() + 200;
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
                this.repelledUntil = Date.now() + 200;
                break;
            } else if (result && result.type === 'repelled') {
                this.message = result.message;
                this.repelledUntil = Date.now() + 200;
            } else if (result && result.type === 'bossDefeated') {
                this.message = result.message;
                this.repelledUntil = Date.now() + 200;
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
                if (h.bomb && h.warnUntil && Date.now() < h.warnUntil) continue;
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
     * Обновление снарядов (стрелы лука): движение, столкновения со стенами/врагами
     */
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const ny = p.y + p.dy;
            const nx = p.x + p.dx;

            // Столкновение со стеной или краем карты — снаряд исчезает
            if (!PathFinder.isPassable(ny, nx, this.maze, this.rows, this.cols)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Столкновение с боссом (2x2)
            if (this.boss && !this.boss.defeated && this.boss.blockCovers(this.boss.y, this.boss.x, ny, nx)) {
                this.boss.hp -= 1;
                this.projectiles.splice(i, 1);
                if (this.boss.hp <= 0) {
                    this.boss.defeated = true;
                    this.boss.chase = false;
                    this.boss.searching = false;
                    this.boss.path = [];
                    this.boss.returnPath = [];
                    this.boss.wanderPath = [];
                    this.boss.pathGoal = null;
                    this.message = t('msg_boss_arrow_killed');
                    this.repelledUntil = Date.now() + 200;
                    const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { boss: 30 };
                    this.grantCoins(R.boss);
                    if (typeof updateStat === 'function') { updateStat('bossesDefeated', 1); unlockAchievement('boss_arrow'); checkAchievements(); }
                } else if (this.boss.hp <= Math.floor(this.boss.maxHp / 2) && this.boss.stage === 1) {
                    this.boss.stage = 2;
                    this.message = t('msg_boss_enraged', this.boss.hp);
                } else {
                    this.message = t('msg_boss_arrow_hit', this.boss.hp);
                }
                continue;
            }

            // Столкновение с секретным боссом (1x1) — проверяем ДО обычных врагов
            const secretBoss = this.enemies.find(e => e.type === 'secretBoss' && e.y === ny && e.x === nx);
            if (secretBoss) {
                const res = secretBoss.takeSwordHit(this);
                this.projectiles.splice(i, 1);
                if (res) {
                    this.message = res.message;
                    this.repelledUntil = Date.now() + 200;
                }
                continue;
            }

            // Столкновение с обычным врагом
            const enemy = this.enemies.find(e =>
                e.type !== 'boss' && e.type !== 'secretBoss' && e.y === ny && e.x === nx
            );
            if (enemy) {
                this.removeEnemy(enemy);
                this.projectiles.splice(i, 1);
                this.message = t('msg_enemy_arrow_killed', enemy.id);
                if (typeof updateStat === 'function') { updateStat('arrowKills', 1); checkAchievements(); }
                continue;
            }

            // Двигаем снаряд на 1 клетку
            p.y = ny;
            p.x = nx;
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
            this.message = (t('msg_status_spotted') + ' ' + lockIcon + ' ' + keyInfo).trim();
        } else if (searching.length > 0) {
            this.message = (t('msg_status_searching') + ' ' + lockIcon + ' ' + keyInfo).trim();
        } else if (waiting.length > 0) {
            const maxWait = Math.max(...waiting.map(e => e.loseCount));
            this.message = (t('msg_status_waiting', maxWait, this.enemyConfig.agroLimit) + ' ' + lockIcon + ' ' + keyInfo).trim();
        } else if (this.level.tutorial) {
            this.message = this.tutorialHint();
        } else if (this.keyConfig.enabled && !this.hasAllKeys()) {
            this.message = t('msg_keys_collect', this.keysCollected, this.keys.length) + ' ' + lockIcon;
        } else {
            this.message = this.isFinishLocked() ? t('msg_finish_locked') : t('msg_finish_open');
        }
    }

    /**
     * Пошаговая подсказка для обучающего уровня
     * @returns {string}
     */
    tutorialHint() {
        const lockIcon = this.isFinishLocked() ? '🔒' : '🔓';
        if (this.keyConfig.enabled && !this.hasAllKeys()) {
            return t('tut_collect_keys', this.keysCollected, this.keys.length, lockIcon);
        }
        if (!this.player.hasSword) {
            return t('tut_find_crack', lockIcon);
        }
        if (this.enemies.length > 0) {
            return t('tut_kill_enemies');
        }
        return t('tut_go_finish');
    }

    /**
     * Получение стартового сообщения
     * @param {Object} level - объект уровня
     * @returns {string}
     */
    getStartMessage(level) {
        let msg = t('start_map', this.levelIndex + 1, getLevelName(level, this.levelIndex));
        if (this.keyConfig.enabled && this.keys.length > 0) {
            msg += t('start_collect_keys', this.keyConfig.count);
        } else if (this.finishConfig.lockWhenChased) {
            msg += t('start_finish_chase');
        }
        if (this.fogEnabled) {
            msg += t('start_fog');
        }
        if (this.playerConfig.invincible) {
            msg = t('start_invincible') + msg;
        }
        if (level.tutorial) {
            msg += t('start_tutorial_hint');
        }
        if (this.levelIndex === getTotalLevels() - 2) {
            msg += t('start_boss_warning');
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
                        // Исключаем клетки в радиусе 2 от уже поставленных входов
                        const nearSecret = this.secret &&
                            Math.abs(this.secret.entrance.y - ny) + Math.abs(this.secret.entrance.x - nx) <= 2;
                        const nearBoss = this.level.secretBossEntrance &&
                            Math.abs(this.level.secretBossEntrance.y - ny) + Math.abs(this.level.secretBossEntrance.x - nx) <= 2;
                        if (!nearSecret && !nearBoss) {
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

        // 4 пьедестала: колонна, напрямую достижимы от входа (1,1)
        const pedestals = [
            { itemId: 'sword',     y: 2, x: 3 },
            { itemId: 'hpBonus',   y: 4, x: 3 },
            { itemId: 'swordPlus', y: 6, x: 3 },
            { itemId: 'bow',       y: 8, x: 3 }
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
        if (!this.shop || this.inShopRoom || this.inSecretRoom || this.inSecretBossRoom) return false;

        this.mainMaze = this.maze;
        this.mainRows = this.rows;
        this.mainCols = this.cols;
        this.mainEnemies = this.enemies;
        this.mainHazards = this.hazards;
        this.mainProjectiles = this.projectiles;
        this.shop.back = { y: this.player.y, x: this.player.x };

        this.maze = this.shop.roomMaze;
        this.rows = this.shop.roomMaze.length;
        this.cols = this.shop.roomMaze[0].length;
        this.player.y = this.shop.entryPos.y;
        this.player.x = this.shop.entryPos.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inShopRoom = true;

        this.message = t('msg_shop_enter');
        this.stopBossMusic();
        this.stopSecretBossMusic();
        if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
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
        this.enemies = this.mainEnemies;
        this.hazards = this.mainHazards;
        this.projectiles = this.mainProjectiles;
        this.player.y = this.shop.back.y;
        this.player.x = this.shop.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inShopRoom = false;
        this.player.facing = { dy: -1, dx: 0 };

        this.message = t('msg_shop_exit');
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
                        const nearSecret = this.secret &&
                            Math.abs(this.secret.entrance.y - ny) + Math.abs(this.secret.entrance.x - nx) <= 2;
                        const nearShop = this.shop &&
                            Math.abs(this.shop.entrance.y - ny) + Math.abs(this.shop.entrance.x - nx) <= 2;
                        if (!nearSecret && !nearShop) {
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
        this.mainProjectiles = this.projectiles;
        this.mainExplored = this.explored;
        this.mainBoss = this.boss;
        this.secretBoss.back = { y: this.player.y, x: this.player.x };

        // Арена 15x15 — открытое пространство с бортиком
        this.maze = this.generateSecretBossMaze();
        this.rows = this.maze.length;
        this.cols = this.maze[0].length;
        this.hazards = [];
        this.projectiles = [];
        this.explored = [];
        for (let y = 0; y < this.rows; y++) {
            this.explored[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.explored[y][x] = false;
            }
        }
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
            ? t('msg_secret_boss_arena_defeated')
            : t('msg_secret_boss_arena_enter');
        this.stopBossMusic();
        if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
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
        this.projectiles = this.mainProjectiles;
        this.explored = this.mainExplored;
        this.boss = this.mainBoss;
        this.player.y = this.secretBoss.back.y;
        this.player.x = this.secretBoss.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inSecretBossRoom = false;
        this.player.facing = { dy: -1, dx: 0 };

        // Восстанавливаем исходное HP игрока после арены
        if (this.secretBoss.hpBackup) {
            this.player.maxHp = this.secretBoss.hpBackup.maxHp;
            this.player.hp = this.secretBoss.hpBackup.hp;
            delete this.secretBoss.hpBackup;
        }

        this.message = t('msg_secret_boss_arena_exit');
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
            this.message = t('msg_shop_bought', res.item.icon, getShopItemName(res.item.id), getWallet());
            if (itemId === 'sword') this.player.giveSword();
            else if (itemId === 'hpBonus') { this.player.maxHp++; this.player.hp = this.player.maxHp; }
            else if (itemId === 'swordPlus') this.player.swordPlus = true;
            else if (itemId === 'bow') this.player.giveBow();
            if (typeof updateStat === 'function') { updateStat('shopBuys', 1); if (itemId === 'swordPlus') unlockAchievement('sword_plus'); checkAchievements(); }
        } else {
            this.message = t('msg_shop_fail', res.reason);
        }
        this.shopConfirmPending = false;
        return res.ok;
    }

    /**
     * Показать модалку подтверждения покупки товара
     * @param {string} itemId
     */
    showShopConfirm(itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;
        const check = canBuy(itemId);

        if (!check.ok) {
            this.message = t('msg_shop_fail', check.reason);
            return;
        }

        this._shopConfirmItem = itemId;
        this.shopConfirmPending = true;

        const modal = document.getElementById('shop-confirm');
        const icon = document.getElementById('shop-confirm-icon');
        const name = document.getElementById('shop-confirm-name');
        const price = document.getElementById('shop-confirm-price');
        const coins = document.getElementById('shop-confirm-coins');
        const buyBtn = modal.querySelector('[onclick="shopConfirmBuy()"]');

        icon.textContent = item.icon;
        name.textContent = getShopItemName(item.id);
        price.textContent = t('shop_confirm_price', item.price);
        coins.textContent = t('shop_confirm_coins', getWallet());
        buyBtn.disabled = false;
        buyBtn.textContent = t('shop_confirm_buy');

        modal.classList.remove('hidden');
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
        if (!this.secret || this.secret.used || this.inSecretRoom || this.inShopRoom || this.inSecretBossRoom) return false;

        // Запоминаем текущее состояние основного лабиринта
        this.mainMaze = this.maze;
        this.mainRows = this.rows;
        this.mainCols = this.cols;
        this.mainExplored = this.explored;
        this.mainEnemies = this.enemies;
        this.mainHazards = this.hazards;
        this.mainProjectiles = this.projectiles;
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
        if (typeof updateStat === 'function') { updateStat('secretRoomsFound', 1); checkAchievements(); }

        this.message = t('msg_secret_room');
        this.stopBossMusic();
        this.stopSecretBossMusic();
        if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
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
            if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
            this.playSecretBossMusic();
        } else if (this.isBossLevel) {
            this.stopSecretBossMusic();
            if (typeof pauseLevelMusic === 'function') pauseLevelMusic();
            this.playBossMusic();
        } else {
            this.stopSecretBossMusic();
            this.stopBossMusic();
            if (typeof resumeLevelMusicGlobal === 'function') resumeLevelMusicGlobal();
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
     * Игровой цикл: враги двигаются автоматически по таймеру
     */
    startLoop() {
        this.stopLoop();
        const interval = this.settings.difficulty === 'easy' ? 1000
            : this.settings.difficulty === 'hard' ? 600
            : 800;
        this._loopTimer = setInterval(() => {
            if (this.gameOver || !this.gameRunning) {
                this.stopLoop();
                return;
            }
            this.tickWorld();
            // Сброс hurtThisTurn если 500мс неуязвимости прошли,
            // иначе игрок AFK бессмертен
            if (this.player.hurtUntil > 0 && Date.now() >= this.player.hurtUntil) {
                this.player.hurtThisTurn = false;
                this.player.hurtUntil = 0;
            }
            // Синхронизация prev позиций игрока перед тиком врагов,
            // чтобы adjacentPause видел актуальную позицию, а не устаревшую
            this.player.prevY = this.player.y;
            this.player.prevX = this.player.x;
            this.updateEnemies();
            if (this.renderer) this.renderer.draw();
        }, interval);
    }

    /**
     * Остановить игровой цикл
     */
    stopLoop() {
        if (this._loopTimer) {
            clearInterval(this._loopTimer);
            this._loopTimer = null;
        }
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
        this.explored = this.mainExplored;
        this.enemies = this.mainEnemies;
        this.hazards = this.mainHazards;
        this.projectiles = this.mainProjectiles;
        this.player.y = this.secret.back.y;
        this.player.x = this.secret.back.x;
        this.player.prevY = this.player.y;
        this.player.prevX = this.player.x;
        this.inSecretRoom = false;
        this.player.facing = { dy: -1, dx: 0 };

        if (picked) {
            // Комната "использована" только после подбора меча:
            // иначе на уровне босса выход без меча навсегда блокировал бы вход (софтлок)
            this.secret.used = true;
            this.player.giveSword();
            this.message = t('msg_got_sword');
        } else {
            this.message = t('msg_secret_exit');
        }
        this.stopSecretMusic();
        this.resumeLevelMusic();
        return true;
    }
}

// Глобальные функции для модалки подтверждения покупки
function shopConfirmBuy() {
    if (!currentGame || !currentGame._shopConfirmItem) return;
    const itemId = currentGame._shopConfirmItem;
    document.getElementById('shop-confirm').classList.add('hidden');
    currentGame.buyOnPedestal(itemId);
    currentGame._shopConfirmItem = null;
}

function shopConfirmCancel() {
    if (!currentGame) return;
    document.getElementById('shop-confirm').classList.add('hidden');
    currentGame.shopConfirmPending = false;
    currentGame._shopConfirmItem = null;
}