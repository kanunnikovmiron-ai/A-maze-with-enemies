/**
 * Класс врага
 */
class Enemy {
    /**
     * @param {string} id - идентификатор врага (E1, E2, ...)
     * @param {number} y - начальная координата Y
     * @param {number} x - начальная координата X
     * @param {EnemyConfig} config - конфигурация врагов
     * @param {Object} gameConfig - общая конфигурация игры
     */
    constructor(id, y, x, config, gameConfig) {
        this.id = id;
        this.y = y;
        this.x = x;
        this.homeY = y;    // Домашняя позиция для возврата
        this.homeX = x;
        this.config = config;
        this.gameConfig = gameConfig;
        this.type = 'enemy';     // Тип врага (patrol/boss переопределяют)

        // Состояния врага
        this.chase = false;      // Преследует игрока
        this.searching = false;  // Ищет игрока на последней позиции
        this.returning = false;  // Возвращается на домашнюю позицию
        this.loseCount = 0;      // Счетчик потери из виду

        // Данные для перемещения
        this.path = [];          // Текущий путь
        this.lastSeenPos = null; // Последняя позиция, где видели игрока
        this.returnPath = [];    // Путь возврата домой
        this.waitTimer = 0;      // Таймер ожидания при патрулировании
        this.trail = [];         // История перемещений (для отрисовки следа)
        this.adjacentPause = false; // Флаг замедления при погоне вплотную
    }

    /**
     * Проверка прямой видимости до игрока
     * @param {Object} player - позиция игрока {y, x}
     * @param {Array} maze - лабиринт
     * @returns {boolean} видит ли враг игрока
     */
    canSeePlayer(player, maze) {
        // Проверка дальности видимости
        const distance = Math.abs(this.y - player.y) + Math.abs(this.x - player.x);
        if (distance > this.config.visionRange) return false;

        // Проверка прямой видимости по вертикали
        if (this.x === player.x) {
            const step = player.y > this.y ? 1 : -1;
            for (let y = this.y + step; y !== player.y; y += step) {
                if (maze[y][this.x] === 1) return false; // Стена мешает
            }
            return true;
        }

        // Проверка прямой видимости по горизонтали
        if (this.y === player.y) {
            const step = player.x > this.x ? 1 : -1;
            for (let x = this.x + step; x !== player.x; x += step) {
                if (maze[this.y][x] === 1) return false; // Стена мешает
            }
            return true;
        }

        return false; // Не на одной линии
    }

    /**
     * Получение случайного направления для патрулирования
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @returns {Array|null} [dy, dx] или null
     */
    getRandomPatrolMove(maze, enemies) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        // Перемешиваем направления для случайности
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        // Ищем первое доступное направление
        for (const [dy, dx] of directions) {
            const ny = this.y + dy;
            const nx = this.x + dx;

            // Пропускаем стены
            if (!PathFinder.isPassable(ny, nx, maze, this.gameConfig.rows, this.gameConfig.cols)) continue;

            // Пропускаем клетки с другими врагами
            if (enemies.find(e => e !== this && e.y === ny && e.x === nx)) continue;

            return [dy, dx];
        }

        return null;
    }

    /**
     * Обновление состояния и перемещение врага
     * @param {Object} player - позиция игрока
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @param {Function} getRandomPassable - функция получения случайной проходимой клетки
     * @returns {Object|null} результат столкновения с игроком
     */
    update(player, maze, enemies, getRandomPassable) {
        // Обновляем состояние (видимость, поиск, возврат)
        this.handleState(player, maze, enemies, getRandomPassable);

        // Выполняем движение в зависимости от состояния
        if ((this.chase || this.searching) && this.path.length > 0) {
            // Движение по пути преследования/поиска
            const next = this.path[0];
            let canStep = this.canMoveTo(next.y, next.x, enemies, maze);

            // Замедление вплотную: если в начале хода враг стоял рядом с игроком,
            // он двигается через ход — иначе от него невозможно убежать
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
        } else if (this.returning && this.returnPath && this.returnPath.length > 0) {
            // Движение по пути возврата
            const next = this.returnPath[0];
            if (this.canMoveTo(next.y, next.x, enemies, maze)) {
                this.returnPath.shift();
                this.y = next.y;
                this.x = next.x;
            }
            if (this.returnPath.length === 0) {
                // Вернулись домой
                this.returning = false;
                this.homeY = this.y;
                this.homeX = this.x;
            }
        } else if (!this.chase && !this.searching && this.loseCount === 0 && !this.returning) {
            // Патрулирование
            this.patrolMove(maze, enemies);
        }

        // Проверка столкновения с игроком
        return this.checkCollision(player, maze, enemies, getRandomPassable);
    }

    /**
     * Обновление состояния врага (видимость, преследование, поиск, возврат)
     * @param {Object} player - позиция игрока
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @param {Function} getRandomPassable - функция получения случайной проходимой клетки
     */
    handleState(player, maze, enemies, getRandomPassable) {
        // Исправляем позицию, если враг оказался в стене
        if (!PathFinder.isPassable(this.y, this.x, maze, this.gameConfig.rows, this.gameConfig.cols)) {
            this.repositionTo(maze, enemies, player, getRandomPassable);
        }

        // Проверяем видимость игрока
        const sees = this.canSeePlayer(player, maze);

        if (sees) {
            // Игрок в зоне видимости - начинаем преследование
            this.lastSeenPos = { y: player.y, x: player.x };
            this.loseCount = 0;
            this.chase = true;
            this.searching = false;
            this.returning = false;
            this.returnPath = [];
            this.path = PathFinder.findPath(this, player, maze, this.gameConfig.rows, this.gameConfig.cols);
        } else if (this.chase && !this.returning) {
            // Потеряли игрока из виду - ищем на последней позиции
            this.chase = false;
            this.searching = true;
            this.path = PathFinder.findPath(this, this.lastSeenPos, maze, this.gameConfig.rows, this.gameConfig.cols);
            this.loseCount = 0;
        } else if (this.searching && !this.returning) {
            // Закончили поиск на последней позиции
            if (this.path.length === 0) {
                this.searching = false;
                this.loseCount = 1;
            }
        } else if (!this.chase && !this.searching && this.loseCount > 0 && !this.returning) {
            // Считаем ходы после потери из виду
            this.loseCount++;
            if (this.loseCount > this.config.agroLimit) {
                // Превышен лимит агрессии - возвращаемся
                this.loseCount = 0;
                this.returning = true;
                this.returnPath = PathFinder.findPath(
                    this,
                    this.getReturnTarget(maze),
                    maze,
                    this.gameConfig.rows,
                    this.gameConfig.cols
                );
                this.lastSeenPos = null;
            }
        }

        // Сохраняем позицию в историю для следа
        this.trail.push({
            y: this.y,
            x: this.x,
            chase: this.chase,
            searching: this.searching
        });
        if (this.trail.length > 25) this.trail.shift();
    }

    /**
     * Перемещение врага из стены в случайную клетку (хук для подклассов)
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @param {Object} player - позиция игрока
     * @param {Function} getRandomPassable - функция получения случайной проходимой клетки
     */
    repositionTo(maze, enemies, player, getRandomPassable) {
        const cell = getRandomPassable([player, ...enemies.filter(e => e !== this)]);
        this.y = cell.y;
        this.x = cell.x;
        this.homeY = cell.y;
        this.homeX = cell.x;
    }

    /**
     * Получение точки возврата (хук для подклассов)
     * @param {Array} maze - лабиринт
     * @returns {Object} {y, x}
     */
    getReturnTarget(maze) {
        return { y: this.homeY, x: this.homeX };
    }

    /**
     * Патрульное перемещение (хук для подклассов)
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
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
     * Проверка столкновения с игроком
     * @param {Object} player - позиция игрока
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @param {Function} getRandomPassable - функция получения случайной проходимой клетки
     * @returns {Object|null} результат столкновения
     */
    checkCollision(player, maze, enemies, getRandomPassable) {
        if (this.y !== player.y || this.x !== player.x) return null;

        if (player.isInvincible()) {
            // Игрок неуязвим - отбрасываем врага
            const cell = getRandomPassable([player, ...enemies.filter(e => e !== this)]);
            this.y = cell.y;
            this.x = cell.x;
            this.homeY = cell.y;
            this.homeX = cell.x;
            this.resetState(maze);
            return { type: 'repelled', message: this.getRepelMessage() };
        }

        // Игрок пойман
        return { type: 'caught', message: this.getCatchMessage() };
    }

    /**
     * Сообщение при поимке игрока (хук для подклассов)
     * @returns {string}
     */
    getCatchMessage() {
        return t('msg_enemy_catch', this.id);
    }

    /**
     * Сообщение при отбрасывании врага (хук для подклассов)
     * @returns {string}
     */
    getRepelMessage() {
        return t('msg_enemy_repel');
    }

    /**
     * Проверка возможности перемещения в клетку
     * @param {number} y - целевая Y
     * @param {number} x - целевая X
     * @param {Array} enemies - все враги
     * @param {Array} maze - лабиринт
     * @returns {boolean} можно ли переместиться
     */
    canMoveTo(y, x, enemies, maze) {
        if (!PathFinder.isPassable(y, x, maze, this.gameConfig.rows, this.gameConfig.cols)) {
            return false;
        }
        if (enemies.find(e => e !== this && e.y === y && e.x === x)) {
            return false;
        }
        return true;
    }

    /**
     * Сброс состояния врага
     * @param {Array} maze - лабиринт
     */
    resetState(maze) {
        this.chase = false;
        this.searching = false;
        this.loseCount = 0;
        this.returning = true;
        this.returnPath = PathFinder.findPath(
            this,
            { y: this.homeY, x: this.homeX },
            maze,
            this.gameConfig.rows,
            this.gameConfig.cols
        );
    }
}