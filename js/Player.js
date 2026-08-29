/**
 * Класс игрока
 */
class Player {
    /**
     * @param {number} y - начальная координата Y
     * @param {number} x - начальная координата X
     * @param {PlayerConfig} config - конфигурация игрока
     */
    constructor(y, x, config, bossLevel) {
        this.y = y;
        this.x = x;
        this.prevY = y;
        this.prevX = x;
        this.config = config;
        this.hasSword = false;         // Меч из секретной комнаты (бессрочный)
        this.swordPlus = false;        // Улучшенный меч из магазина (урон боссу 2)
        this.hasBow = false;           // Лук из магазина/секретки (дальнее оружие)
        this.bowCooldown = 0;          // Кулдаун выстрела (0 = можно стрелять)
        this.swingCooldown = 0;        // Кулдаун взмаха мечом (мс)
        this.facing = { dy: 0, dx: 0 }; // Направление последнего успешного хода (для взмаха)
        this.maxHp = bossLevel ? 3 : 1; // HP: на босс-уровне 3, на обычных — 1
        this.hp = this.maxHp;          // Текущее здоровье игрока
        this.hurtUntil = 0;            // Timestamp до которого действует неуязвимость после урона
        this.hurtThisTurn = false;     // Уже получил урон в этот ход (защита от двойного урона, совместимость с тестами)
    }

    /**
     * Получение урона: -1 HP. При 0 HP — поражение.
     * Неуязвимость (настройка) полностью блокирует урон.
     * @param {Object} game - объект игры
     * @param {string} defeatMessage - сообщение при смерти
     * @returns {boolean} true — игрок умер
     */
    takeDamage(game, defeatMessage) {
        if (this.isInvincible()) return false;
        this.hp--;
        this.hurtUntil = Date.now() + 500;
        this.hurtThisTurn = true;
        game.levelHits = (game.levelHits || 0) + 1;
        if (this.hp <= 0) {
            game.gameOver = true;
            game.message = defeatMessage;
            if (typeof updateStat === 'function') {
                updateStat('totalDeaths', 1);
                if (game.settings && game.settings.difficulty === 'hard') {
                    updateStat('hardcoreDeaths', 1);
                }
            }
            return true;
        }
        game.message = t('msg_hurt', this.hp, this.maxHp);
        return false;
    }

    /**
     * Активна ли неуязвимость (только из настроек)
     * @returns {boolean}
     */
    isInvincible() {
        return this.config.invincible;
    }

    /**
     * Выдать игроку меч (подбор в секретной комнате)
     */
    giveSword() {
        this.hasSword = true;
    }

    /**
     * Выдать игроку лук (подбор или покупка)
     */
    giveBow() {
        this.hasBow = true;
    }

    /**
     * Попытка перемещения игрока
     * @param {number} dy - смещение по Y
     * @param {number} dx - смещение по X
     * @param {Object} game - объект игры
     * @returns {boolean} успешно ли перемещение
     */
    move(dy, dx, game) {
        if (game.gameOver) return false;
        if (game.shopConfirmPending) return false;

        // Сбрасываем флаги отбрасывания врага и подбора ключа на этот ход
        game.repelledUntil = 0;
        game.pickedKeyThisTurn = false;
        this.hurtUntil = 0;
        this.hurtThisTurn = false;
        game.moves = (game.moves || 0) + 1;
        if (this.bowCooldown > 0) this.bowCooldown--;
        // Анимация взмаха исчезает при следующем действии
        game.swingFlash = null;

        // Запоминаем позицию до хода (для механики замедления врага вплотную)
        this.prevY = this.y;
        this.prevX = this.x;

        const ny = this.y + dy;
        const nx = this.x + dx;

        // Вход в комнату магазина через дверь-проход
        if (!game.inShopRoom && !game.inSecretRoom && !game.inSecretBossRoom && game.shop &&
            ny === game.shop.entrance.y && nx === game.shop.entrance.x) {
            return game.enterShopRoom();
        }

        // Вход в секретную комнату через стену-проход
        if (!game.inSecretRoom && !game.inShopRoom && !game.inSecretBossRoom && game.secret && !game.secret.used &&
            ny === game.secret.entrance.y && nx === game.secret.entrance.x) {
            return game.enterSecretRoom();
        }

        // Вход в арену секретного босса через розовую трещину
        if (!game.inSecretBossRoom && !game.inSecretRoom && !game.inShopRoom && game.secretBoss &&
            !game.secretBoss.defeated &&
            ny === game.secretBoss.entrance.y && nx === game.secretBoss.entrance.x) {
            return game.enterSecretBossRoom();
        }

        // Движение внутри комнаты магазина
        if (game.inShopRoom) {
            if (!PathFinder.isPassable(ny, nx, game.maze, game.rows, game.cols)) {
                return false;
            }
            this.y = ny;
            this.x = nx;
            this.facing = { dy, dx };

            // Выход-портал
            if (ny === game.shop.entryPos.y && nx === game.shop.entryPos.x) {
                game.exitShopRoom();
            } else {
                // Пьедестал с товаром — подтверждение покупки
                const ped = game.shop.pedestals.find(p => p.y === ny && p.x === nx);
                if (ped) game.showShopConfirm(ped.itemId);
            }
            return true;
        }

        // Движение внутри арены секретного босса
        if (game.inSecretBossRoom) {
            if (!PathFinder.isPassable(ny, nx, game.maze, game.rows, game.cols)) {
                return false;
            }

            // Выход-портал через клетку входа (розовую трещину)
            if (ny === game.secretBoss.entryPos.y && nx === game.secretBoss.entryPos.x) {
                this.y = ny;
                this.x = nx;
                this.facing = { dy, dx };
                game.exitSecretBossRoom();
                return true;
            }

            // Столкновение с сердцем
            const heart = game.enemies.find(e => e.type === 'secretBoss' && e.y === ny && e.x === nx);
            if (heart && !heart.defeated) {
                if (this.isInvincible()) {
                    const cell = game.getRandomPassable([this, ...game.enemies.filter(e => e !== heart)]);
                    heart.y = cell.y;
                    heart.x = cell.x;
                    heart.homeY = cell.y;
                    heart.homeX = cell.x;
                    heart.resetState(game.maze);
                    game.message = t('msg_heart_repelled');
                    game.repelledUntil = Date.now() + 200;
                } else {
                    const defeatMessage = t('msg_defeat_heart');
                    if (this.takeDamage(game, defeatMessage)) {
                        return false;
                    }
                    const cell = game.getRandomPassable([this, ...game.enemies.filter(e => e !== heart)]);
                    heart.y = cell.y;
                    heart.x = cell.x;
                    heart.homeY = cell.y;
                    heart.homeX = cell.x;
                    heart.resetState(game.maze);
                    game.repelledUntil = Date.now() + 200;
                }
            }

            this.y = ny;
            this.x = nx;
            this.facing = { dy, dx };

            // Огонь бомбы: -1 HP
            const fire = game.hazards.find(h => h.phase === 'fire' && h.y === ny && h.x === nx);
            if (fire && this.hurtUntil <= Date.now() && !this.hurtThisTurn && this.takeDamage(game, t('msg_defeat_bomb'))) {
                return true;
            }

            // Тик опасностей (warn→fire) для секретного босса
            game.tickWorld();

            // Огонь, вспыхнувший под игроком в этот ход
            const fireNow = game.hazards.find(h => h.phase === 'fire' && h.y === this.y && h.x === this.x);
            if (fireNow && this.hurtUntil <= Date.now() && !this.hurtThisTurn && this.takeDamage(game, t('msg_defeat_bomb'))) {
                return true;
            }
            return true;
        }

        // Движение внутри секретной комнаты
        if (game.inSecretRoom) {
            // Проверяем проходимость в лабиринте комнаты
            if (!PathFinder.isPassable(ny, nx, game.maze, game.rows, game.cols)) {
                return false;
            }
            this.y = ny;
            this.x = nx;
            this.facing = { dy, dx };

            // Портал-выход (клетка входа)
            if (ny === game.secret.entryPos.y && nx === game.secret.entryPos.x) {
                game.exitSecretRoom(false);
            }
            // Бонус неуязвимости
            else if (ny === game.secret.pickupPos.y && nx === game.secret.pickupPos.x && !game.secret.used) {
                game.exitSecretRoom(true);
            }
            return true;
        }

        // Проверяем проходимость
        if (!PathFinder.isPassable(ny, nx, game.maze, game.rows, game.cols)) {
            return false;
        }

        // Диагональное движение: запрет рубки углов (нужен хотя бы один смежный проход)
        if (dy !== 0 && dx !== 0) {
            const hOk = PathFinder.isPassable(this.y, nx, game.maze, game.rows, game.cols);
            const vOk = PathFinder.isPassable(ny, this.x, game.maze, game.rows, game.cols);
            if (!hOk && !vOk) return false;
        }

        // Проверяем столкновение с врагом (босс занимает блок 2x2)
        const enemyThere = game.enemies.find(e =>
            e.type === 'boss'
                ? !e.defeated && e.getCells().some(c => c.y === ny && c.x === nx)
                : e.y === ny && e.x === nx
        );
        if (enemyThere) {
            if (this.isInvincible()) {
                if (enemyThere.type === 'boss') {
                    // Неуязвимость - отбрасываем блок босса (дом босса сохраняется)
                    const cell = enemyThere.getKnockbackCell(this, game.maze, game.enemies, { y: ny, x: nx });
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.resetStateBlock(game.maze);
                    game.message = t('msg_boss_repelled');
                } else {
                    // Неуязвимость - отбрасываем врага
                    const cell = game.getRandomPassable([this, ...game.enemies.filter(e => e !== enemyThere)]);
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.homeY = cell.y;
                    enemyThere.homeX = cell.x;
                    enemyThere.resetState(game.maze);
                    game.message = t('msg_enemy_repelled');
                }
                game.repelledUntil = Date.now() + 200;
            } else {
                // Первое касание: -1 HP и отброс врага, второе касание — поражение
                const defeatMessage = enemyThere.type === 'boss'
                    ? t('msg_defeat_boss_touch')
                    : t('msg_defeat_enemy_touch', enemyThere.id);
                if (this.takeDamage(game, defeatMessage)) {
                    return false;
                }
                // Выжили: отбрасываем врага как при неуязвимости, но с уроном
                if (enemyThere.type === 'boss') {
                    const cell = enemyThere.getKnockbackCell(this, game.maze, game.enemies, { y: ny, x: nx });
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.resetStateBlock(game.maze);
                } else {
                    const cell = game.getRandomPassable([this, ...game.enemies.filter(e => e !== enemyThere)]);
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.homeY = cell.y;
                    enemyThere.homeX = cell.x;
                    enemyThere.resetState(game.maze);
                }
                game.repelledUntil = Date.now() + 200;
            }
        }

        // Подбираем часть ключа, если игрок входит в её клетку
        const keyHere = game.keys.find(k => !k.collected && k.y === ny && k.x === nx);
        if (keyHere) {
            keyHere.collected = true;
            game.keysCollected++;
            game.message = t('msg_key_found', game.keysCollected, game.keys.length);
            game.pickedKeyThisTurn = true;
        }

        // Проверяем финиш — всегда проходим (как враги)
        if (ny === game.finish.y && nx === game.finish.x && game.isFinishLocked()) {
            if (game.boss && !game.boss.defeated) {
                game.message = t('msg_defeat_boss_first');
            } else if (game.keyConfig.enabled && !game.hasAllKeys()) {
                game.message = t('msg_need_both_keys', game.keysCollected, game.keys.length);
            } else {
                game.message = t('msg_finish_blocked');
            }
        }

        // Подбираем пикапы редактора (меч, бафы), если игрок входит в их клетку
        const pickupHere = (game.pickups || []).find(p => !p.collected && p.y === ny && p.x === nx);
        if (pickupHere) {
            pickupHere.collected = true;
            if (pickupHere.type === 'sword') {
                this.giveSword();
                game.message = t('msg_got_sword_pickup');
            } else if (pickupHere.type === 'buffHp') {
                this.maxHp += 1;
                this.hp = Math.min(this.maxHp, this.hp + 1);
                game.message = t('msg_hp_bonus', this.hp, this.maxHp);
            } else if (pickupHere.type === 'buffInv') {
                this.config.invincible = true;
                game.message = t('msg_got_invincible');
            } else if (pickupHere.type === 'bow') {
                this.giveBow();
                game.message = t('msg_got_bow');
            }
            game.pickedKeyThisTurn = true;
        }

        // Перемещаем игрока
        this.y = ny;
        this.x = nx;
        this.facing = { dy, dx };

        // Проверяем победу (только если финиш открыт, иначе игрок просто стоит на клетке)
        if (!game.gameOver && !game.isFinishLocked() && this.y === game.finish.y && this.x === game.finish.x) {
            game.gameOver = true;
            game.message = t('msg_victory');
            game.markLevelCompleted();
            const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { levelClear: 10 };
            game.grantCoins(R.levelClear);
            // Ачивки: завершение уровня
            if (typeof updateStat === 'function') {
                updateStat('levelsCompleted', (getStats().levelsCompleted || 0) + 1);
                if (game.settings && game.settings.difficulty === 'hard') {
                    updateStat('levelsCompletedHard', (getStats().levelsCompletedHard || 0) + 1);
                }
                if (typeof checkLevelAchievements === 'function') {
                    checkLevelAchievements({
                        noDamage: !game.levelHits,
                        fullHp: this.hp === this.maxHp,
                        moves: game.moves || 0,
                        levelIndex: game.levelIndex
                    });
                }
                checkAchievements();
            }
        }

        // Огонь босса: -1 HP (без щита), второе попадание — поражение
        const fire = game.hazards.find(h => h.phase === 'fire' && h.y === ny && h.x === nx);
        if (fire && this.hurtUntil <= Date.now() && !this.hurtThisTurn && this.takeDamage(game, t('msg_defeat_fire'))) {
            return true;
        }

        // Тик опасностей (warn→fire, огонь догорает) — синхронно после хода
        game.tickWorld();

        // Огонь, вспыхнувший под игроком в этот ход (warn -> fire во время тика опасных клеток)
        if (!game.gameOver) {
            const fireNow = game.hazards.find(h => h.phase === 'fire' && h.y === this.y && h.x === this.x);
            if (fireNow && this.hurtUntil <= Date.now() && !this.hurtThisTurn && this.takeDamage(game, t('msg_defeat_fire'))) {
                return true;
            }
        }

        if (!game.gameOver && game.repelledUntil <= Date.now() && !game.pickedKeyThisTurn && this.hurtUntil <= Date.now() && !this.hurtThisTurn) {
            // Обновляем статусное сообщение (не затираем сообщение об уроне)
            game.updateStatusMessage();
        }

        return true;
    }

    /**
     * Урон от огня, появившегося под игроком после хода врагов (при взмахе мечом)
     * @param {Object} game - объект игры
     * @returns {boolean} true — игрок погиб от огня
     */
    takeSwingFireDamage(game) {
        if (game.gameOver) return false;
        const fireNow = game.hazards.find(h => h.phase === 'fire' && h.y === this.y && h.x === this.x);
        if (fireNow && this.hurtUntil <= Date.now() && !this.hurtThisTurn) {
            return this.takeDamage(game, t('msg_defeat_fire'));
        }
        return false;
    }

    /**
     * Hex-расстояние между двумя клетками (axial coordinates → cube)
     */
    static hexDist(y1, x1, y2, x2) {
        const q1 = x1, r1 = y1, s1 = -q1 - r1;
        const q2 = x2, r2 = y2, s2 = -q2 - r2;
        return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
    }

    /**
     * Взмах мечом: AoE-атака по всем врагам в радиусе 2 клеток
     * @param {Object} game - объект игры
     * @returns {Object|null} результат удара ({type, message}) или null
     */
    swing(game) {
        if (game.gameOver || game.inSecretRoom || game.shopConfirmPending) return null;
        this.hurtUntil = 0;
        this.hurtThisTurn = false;

        if (!this.hasSword) {
            game.message = t('msg_no_sword');
            return null;
        }

        if (this.swingCooldown > Date.now()) return null;

        this.swingCooldown = Date.now() + 800;
        const SWING_RADIUS = 2;
        game.swingFlash = { y: this.y, x: this.x, radius: SWING_RADIUS };

        const boss = game.boss;
        const bossHit = [];
        let secretBossHit = null;
        const regularEnemies = [];

        for (const e of game.enemies) {
            if (Player.hexDist(this.y, this.x, e.y, e.x) > SWING_RADIUS) continue;
            if (e.type === 'boss') {
                if (boss && !boss.defeated) bossHit.push(e);
            } else if (e.type === 'secretBoss') {
                if (!secretBossHit) secretBossHit = e;
            } else {
                regularEnemies.push(e);
            }
        }

        if (bossHit.length === 0 && !secretBossHit && regularEnemies.length === 0) {
            game.message = t('msg_swing_miss');
            game.tickWorld();
            this.takeSwingFireDamage(game);
            return null;
        }

        let result = null;

        // Секретный босс
        if (secretBossHit) {
            const res = secretBossHit.takeSwordHit(game);
            if (res) {
                game.repelledUntil = Date.now() + 200;
                result = res;
            }
        }

        // Обычные враги
        for (const e of regularEnemies) {
            if (game.enemies.includes(e)) {
                game.removeEnemy(e);
                result = { type: 'enemyKilled', message: t('msg_enemy_sword_killed', e.id) };
            }
        }
        if (regularEnemies.length > 0 && !result) {
            result = { type: 'enemyKilled', message: t('msg_enemy_sword_killed', regularEnemies[0].id) };
        }
        if (regularEnemies.length > 0) {
            game.message = result.message;
        }

        // Босс
        if (bossHit.length > 0 && boss && !boss.defeated) {
            const anyCellInRange = bossHit.length > 0;
            if (anyCellInRange) {
                const res = boss.applySwordHit(this, game.maze, game.enemies, (ex) => game.getRandomPassable(ex), { y: this.y, x: this.x });
                if (res) {
                    game.repelledUntil = Date.now() + 200;
                    result = res;
                    if (res.type === 'bossDefeated') {
                        const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { boss: 30 };
                        game.grantCoins(R.boss);
                        if (typeof updateStat === 'function') { updateStat('bossesDefeated', 1); unlockAchievement('boss_sword'); checkAchievements(); }
                    }
                }
            }
        }

        if (result) game.message = result.message;

        game.tickWorld();
        if (!game.gameOver) {
            const fireNow = game.hazards.find(h => h.phase === 'fire' && h.y === this.y && h.x === this.x);
            if (fireNow && this.hurtUntil <= Date.now() && !this.hurtThisTurn && this.takeDamage(game, t('msg_defeat_fire'))) {
                return { type: 'playerDied', message: game.message };
            }
        }
        return result;
    }

    /**
     * Выстрел из лука: создаёт снаряд в направлении взгляда
     * @param {Object} game - объект игры
     * @returns {Object|null} результат выстрела
     */
    shootBow(game) {
        if (game.gameOver || game.inSecretRoom || game.shopConfirmPending) return null;
        this.hurtUntil = 0;
        this.hurtThisTurn = false;

        if (!this.hasBow) {
            game.message = t('msg_no_bow');
            return null;
        }

        if (this.bowCooldown > 0) {
            game.message = t('msg_bow_reloading');
            return null;
        }

        const dy = this.facing.dy;
        const dx = this.facing.dx;
        if (dy === 0 && dx === 0) {
            game.message = t('msg_bow_no_direction');
            return null;
        }

        this.bowCooldown = 1;

        // Снаряд: стартует с клетки перед игроком
        const startY = this.y + dy;
        const startX = this.x + dx;

        // Проверка столкновения на клетке спауна (враг/босс сразу под лучом)
        let spawnHit = false;
        if (game.boss && !game.boss.defeated && game.boss.blockCovers(game.boss.y, game.boss.x, startY, startX)) {
            game.boss.hp -= 1;
            spawnHit = true;
            if (game.boss.hp <= 0) {
                game.boss.defeated = true;
                game.boss.chase = false;
                game.boss.searching = false;
                game.boss.path = [];
                game.boss.returnPath = [];
                game.boss.wanderPath = [];
                game.boss.pathGoal = null;
                game.message = t('msg_boss_arrow_killed');
                game.repelledUntil = Date.now() + 200;
                const R = (typeof COIN_REWARDS !== 'undefined') ? COIN_REWARDS : { boss: 30 };
                game.grantCoins(R.boss);
                if (typeof updateStat === 'function') { updateStat('bossesDefeated', 1); unlockAchievement('boss_arrow'); checkAchievements(); }
            } else if (game.boss.hp <= Math.floor(game.boss.maxHp / 2) && game.boss.stage === 1) {
                game.boss.stage = 2;
                game.message = t('msg_boss_enraged', game.boss.hp);
            } else {
                game.message = t('msg_boss_arrow_hit', game.boss.hp);
            }
        } else {
            const secretBoss = game.enemies.find(e => e.type === 'secretBoss' && e.y === startY && e.x === startX);
            if (secretBoss) {
                const res = secretBoss.takeSwordHit(game);
                spawnHit = true;
                if (res) {
                    game.message = res.message;
                    game.repelledUntil = Date.now() + 200;
                }
            } else {
                const enemy = game.enemies.find(e =>
                    e.type !== 'boss' && e.type !== 'secretBoss' && e.y === startY && e.x === startX
                );
                if (enemy) {
                    game.removeEnemy(enemy);
                    spawnHit = true;
                    game.message = t('msg_enemy_arrow_killed', enemy.id);
                    if (typeof updateStat === 'function') { updateStat('arrowKills', 1); checkAchievements(); }
                }
            }
        }

        if (!spawnHit) {
            game.projectiles.push({ y: startY, x: startX, dy, dx, type: 'arrow' });
        }
        if (typeof updateStat === 'function') { updateStat('bowShots', 1); checkAchievements(); }

        game.tickWorld();
        this.takeSwingFireDamage(game);
        return { type: 'shot', message: t('msg_arrow_shot') };
    }
}