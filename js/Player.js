/**
 * Класс игрока
 */
class Player {
    /**
     * @param {number} y - начальная координата Y
     * @param {number} x - начальная координата X
     * @param {PlayerConfig} config - конфигурация игрока
     */
    constructor(y, x, config) {
        this.y = y;
        this.x = x;
        this.prevY = y;
        this.prevX = x;
        this.config = config;
        this.hasSword = false;         // Меч из секретной комнаты (бессрочный)
        this.facing = { dy: 0, dx: 0 }; // Направление последнего успешного хода (для взмаха)
        this.maxHp = 3;                // Максимальное здоровье игрока
        this.hp = 3;                   // Текущее здоровье игрока
        this.hurtThisTurn = false;     // Уже получил урон в этот ход (защита от двойного урона)
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
        this.hurtThisTurn = true;
        if (this.hp <= 0) {
            game.gameOver = true;
            game.message = defeatMessage;
            return true;
        }
        game.message = `💔 Вы ранены! Осталось HP: ${this.hp}/${this.maxHp}`;
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
     * Попытка перемещения игрока
     * @param {number} dy - смещение по Y
     * @param {number} dx - смещение по X
     * @param {Object} game - объект игры
     * @returns {boolean} успешно ли перемещение
     */
    move(dy, dx, game) {
        if (game.gameOver) return false;

        // Сбрасываем флаги отбрасывания врага и подбора ключа на этот ход
        game.repelledThisTurn = false;
        game.pickedKeyThisTurn = false;
        this.hurtThisTurn = false;
        // Анимация взмаха исчезает при следующем действии
        game.swingFlash = null;

        // Запоминаем позицию до хода (для механики замедления врага вплотную)
        this.prevY = this.y;
        this.prevX = this.x;

        const ny = this.y + dy;
        const nx = this.x + dx;

        // Вход в секретную комнату через стену-проход
        if (!game.inSecretRoom && game.secret && !game.secret.used &&
            ny === game.secret.entrance.y && nx === game.secret.entrance.x) {
            return game.enterSecretRoom();
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
                    const cell = enemyThere.getKnockbackCell(this, game.maze, game.enemies);
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.resetStateBlock(game.maze);
                    game.message = '🛡 Босс отброшен.';
                } else {
                    // Неуязвимость - отбрасываем врага
                    const cell = game.getRandomPassable([this, ...game.enemies.filter(e => e !== enemyThere)]);
                    enemyThere.y = cell.y;
                    enemyThere.x = cell.x;
                    enemyThere.homeY = cell.y;
                    enemyThere.homeX = cell.x;
                    enemyThere.resetState(game.maze);
                    game.message = '🛡 Враг отброшен.';
                }
                game.repelledThisTurn = true;
            } else {
                // Первое касание: -1 HP и отброс врага, второе касание — поражение
                const defeatMessage = enemyThere.type === 'boss'
                    ? '💀 ПОРАЖЕНИЕ! Босс 👹 поймал вас!'
                    : `💀 ПОРАЖЕНИЕ! Вы наткнулись на ${enemyThere.id}!`;
                if (this.takeDamage(game, defeatMessage)) {
                    return false;
                }
                // Выжили: отбрасываем врага как при неуязвимости, но с уроном
                if (enemyThere.type === 'boss') {
                    const cell = enemyThere.getKnockbackCell(this, game.maze, game.enemies);
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
                game.repelledThisTurn = true;
            }
        }

        // Проверяем финиш
        if (ny === game.finish.y && nx === game.finish.x) {
            if (game.isFinishLocked()) {
                if (game.boss && !game.boss.defeated) {
                    game.message = '👹 Сначала победите босса!';
                } else if (game.keyConfig.enabled && !game.hasAllKeys()) {
                    game.message = `🔑 Нужны обе части ключа (${game.keysCollected}/${game.keys.length})!`;
                } else {
                    game.message = '🔒 Финиш заблокирован!';
                }
                return false;
            }
        }

        // Подбираем часть ключа, если игрок входит в её клетку
        const keyHere = game.keys.find(k => !k.collected && k.y === ny && k.x === nx);
        if (keyHere) {
            keyHere.collected = true;
            game.keysCollected++;
            game.message = `🔑 Часть ключа найдена (${game.keysCollected}/${game.keys.length})!`;
            game.pickedKeyThisTurn = true;
        }

        // Перемещаем игрока
        this.y = ny;
        this.x = nx;
        this.facing = { dy, dx };

        // Огонь босса: -1 HP (без щита), второе попадание — поражение
        const fire = game.hazards.find(h => h.phase === 'fire' && h.y === ny && h.x === nx);
        if (fire && !this.hurtThisTurn && this.takeDamage(game, '💀 ПОРАЖЕНИЕ! Огонь босса настиг вас!')) {
            return true;
        }

        // Двигаем всех врагов
        game.updateEnemies();

        // Огонь, вспыхнувший под игроком в этот ход (warn -> fire во время тика опасных клеток)
        if (!game.gameOver) {
            const fireNow = game.hazards.find(h => h.phase === 'fire' && h.y === this.y && h.x === this.x);
            if (fireNow && !this.hurtThisTurn && this.takeDamage(game, '💀 ПОРАЖЕНИЕ! Огонь босса настиг вас!')) {
                return true;
            }
        }

        // Проверяем победу
        if (!game.gameOver && this.y === game.finish.y && this.x === game.finish.x) {
            game.gameOver = true;
            game.message = '🏆 ПОБЕДА!';
        } else if (!game.gameOver && !game.repelledThisTurn && !game.pickedKeyThisTurn && !this.hurtThisTurn) {
            // Обновляем статусное сообщение (не затираем сообщение об уроне)
            game.updateStatusMessage();
        }

        return true;
    }

    /**
     * Взмах мечом в направлении facing: убивает обычного врага или бьёт босса
     * @param {Object} game - объект игры
     * @returns {Object|null} результат удара ({type, message}) или null
     */
    swing(game) {
        if (game.gameOver || game.inSecretRoom) return null;
        this.hurtThisTurn = false;

        if (!this.hasSword) {
            game.message = '⚔ У вас нет меча!';
            return null;
        }

        const ty = this.y + this.facing.dy;
        const tx = this.x + this.facing.dx;
        game.swingFlash = { y: ty, x: tx, dy: this.facing.dy, dx: this.facing.dx };

        // Босс: блок 2x2, перекрывающий клетку взмаха
        const boss = game.boss;
        if (boss && !boss.defeated && boss.blockCovers(boss.y, boss.x, ty, tx)) {
            const res = boss.applySwordHit(this, game.maze, game.enemies, (ex) => game.getRandomPassable(ex));
            if (res) {
                game.repelledThisTurn = true;
                game.message = res.message;
                if (res.type === 'bossDefeated') game.message = res.message;
            }
            game.updateEnemies();
            return res;
        }

        // Обычный враг
        const enemy = game.enemies.find(e => e.type !== 'boss' && e.y === ty && e.x === tx);
        if (enemy) {
            game.removeEnemy(enemy);
            game.message = `⚔ ${enemy.id} убит мечом!`;
            game.updateEnemies();
            return { type: 'enemyKilled', message: game.message };
        }

        game.message = '⚔ Взмах мимо!';
        game.updateEnemies();
        return null;
    }
}