/**
 * Класс врага-стража, патрулирующего по замкнутой траектории
 * Наследуется от Enemy для переопределения поведения патрулирования
 */
class PatrolEnemy extends Enemy {
    /**
     * @param {string} id - идентификатор врага (P1, P2, ...)
     * @param {number} y - начальная координата Y
     * @param {number} x - начальная координата X
     * @param {EnemyConfig} config - конфигурация врагов
     * @param {Object} gameConfig - общая конфигурация игры
     */
    constructor(id, y, x, config, gameConfig) {
        // Создаем копию конфигурации, чтобы не менять общую
        const patrolConfig = {
            visionRange: config.visionRange,
            agroLimit: config.agroLimit,
            count: config.count,
            patrolCount: config.patrolCount,
            prefix: 'P',
            // Создаем отдельный объект с цветами для стража
            colors: {
                chase: '#f44',           // Преследование - ярко-красный
                searching: '#d64',       // Поиск - розовый
                waiting: '#d80',         // Ожидание - оранжевый
                returning: '#a0d',       // Возврат - светло-фиолетовый
                patrol: '#80d'           // Патруль - фиолетовый
            },
            // Создаем отдельный объект с эффектами свечения
            glows: {
                chase: { color: '#f00', blur: 10 },
                searching: { color: '#f0f', blur: 7 },
                waiting: { color: '#d0f', blur: 4 },
                returning: { color: '#a0f', blur: 3 },
                patrol: { color: '#80f', blur: 5 }
            }
        };

        super(id, y, x, patrolConfig, gameConfig);

        // Особые свойства для патрульного врага
        this.type = 'patrol';                    // Тип врага
        this.patrolRadius = 3;                   // Радиус патрулирования
        this.patrolCenter = { y: y, x: x };      // Центр патрулирования
        this.patrolPath = [];                     // Путь патрулирования
        this.patrolIndex = 0;                     // Текущий индекс в пути патрулирования
        this.patrolDirection = 1;                 // Направление движения по пути (1 - вперед, -1 - назад)

        // Генерируем путь патрулирования
        this.generatePatrolPath(gameConfig.maze, gameConfig.rows, gameConfig.cols);

        // Ставим индекс на ближайшую к спавну точку маршрута
        this.syncPatrolIndex();
    }

    /**
     * Генерация замкнутого пути патрулирования
     * @param {Array} maze - лабиринт
     * @param {number} rows - количество строк
     * @param {number} cols - количество столбцов
     */
    generatePatrolPath(maze, rows, cols) {
        const path = [];
        const centerY = this.patrolCenter.y;
        const centerX = this.patrolCenter.x;

        // Собираем все доступные клетки в радиусе патрулирования
        const availableCells = [];

        for (let dy = -this.patrolRadius; dy <= this.patrolRadius; dy++) {
            for (let dx = -this.patrolRadius; dx <= this.patrolRadius; dx++) {
                const ny = centerY + dy;
                const nx = centerX + dx;

                // Проверяем, что клетка в радиусе и проходима
                if (PathFinder.isPassable(ny, nx, maze, rows, cols)) {
                    const distance = Math.sqrt(dy * dy + dx * dx);
                    if (distance <= this.patrolRadius) {
                        availableCells.push({
                            y: ny,
                            x: nx,
                            angle: Math.atan2(dy, dx),
                            distance
                        });
                    }
                }
            }
        }

        // Сортируем клетки по углу для создания кругового маршрута
        availableCells.sort((a, b) => a.angle - b.angle);

        // Строим путь, соединяя соседние клетки
        for (let i = 0; i < availableCells.length; i++) {
            const current = availableCells[i];
            const next = availableCells[(i + 1) % availableCells.length];

            // Находим путь между соседними клетками для плавного движения
            const subPath = PathFinder.findPath(
                current,
                next,
                maze,
                rows,
                cols
            );

            if (subPath) {
                // Добавляем точки пути, исключая дубликаты
                for (const point of subPath) {
                    if (path.length === 0 ||
                        path[path.length - 1].y !== point.y ||
                        path[path.length - 1].x !== point.x) {
                        path.push(point);
                    }
                }
            }
        }

        this.patrolPath = path.length > 0 ? path : [{ y: centerY, x: centerX }];
    }

    /**
     * Движение по маршруту патрулирования
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @returns {boolean} удалось ли переместиться
     */
    patrolMove(maze, enemies) {
        if (this.patrolPath.length === 0) return false;

        // Если страж уже стоит на целевой точке — переходим к следующей по маршруту
        if (this.patrolPath[this.patrolIndex].y === this.y &&
            this.patrolPath[this.patrolIndex].x === this.x) {
            this.patrolIndex += this.patrolDirection;
            if (this.patrolIndex >= this.patrolPath.length) {
                this.patrolIndex = 0;
            } else if (this.patrolIndex < 0) {
                this.patrolIndex = this.patrolPath.length - 1;
            }
        }

        const target = this.patrolPath[this.patrolIndex];
        const dist = Math.abs(target.y - this.y) + Math.abs(target.x - this.x);

        // Шаг возможен только в соседнюю клетку (иначе страж "телепортируется" сквозь стены)
        if (dist === 1 && this.canMoveTo(target.y, target.x, enemies, maze)) {
            this.y = target.y;
            this.x = target.x;
            this.homeY = this.y;
            this.homeX = this.x;

            // Перемещаемся по кругу
            this.patrolIndex += this.patrolDirection;

            // Зацикливаем маршрут
            if (this.patrolIndex >= this.patrolPath.length) {
                this.patrolIndex = 0;
            } else if (this.patrolIndex < 0) {
                this.patrolIndex = this.patrolPath.length - 1;
            }

            return true;
        }

        // Соседняя клетка занята/недоступна или страж сошёл с маршрута —
        // идём к точке по одному шагу, обходя стены
        const pathToNext = PathFinder.findPath(
            this,
            target,
            maze,
            this.gameConfig.rows,
            this.gameConfig.cols
        );

        if (pathToNext && pathToNext.length > 0) {
            const next = pathToNext[0];
            if (this.canMoveTo(next.y, next.x, enemies, maze)) {
                this.y = next.y;
                this.x = next.x;
                this.homeY = this.y;
                this.homeX = this.x;
                return true;
            }
        }

        // Если совсем не можем двигаться, меняем направление
        this.patrolDirection *= -1;
        return false;
    }

    /**
     * Перемещение стража из стены (обновляет центр патрулирования)
     * @param {Array} maze - лабиринт
     * @param {Array} enemies - все враги
     * @param {Object} player - позиция игрока
     * @param {Function} getRandomPassable - функция получения случайной проходимой клетки
     */
    repositionTo(maze, enemies, player, getRandomPassable) {
        const cell = getRandomPassable([player, ...enemies.filter(e => e !== this)]);
        this.y = cell.y;
        this.x = cell.x;
        this.patrolCenter = { y: cell.y, x: cell.x };
        this.generatePatrolPath(maze, this.gameConfig.rows, this.gameConfig.cols);
        // Маршрут изменился — синхронизируем позицию на нём, чтобы не прыгать сквозь стены
        this.syncPatrolIndex();
    }

    /**
     * Поиск ближайшей к текущей позиции точки маршрута и её индекс
     * @returns {Object} ближайшая точка {y, x}
     */
    syncPatrolIndex() {
        let nearestPoint = this.patrolPath[0];
        let nearestDist = Infinity;

        for (let i = 0; i < this.patrolPath.length; i++) {
            const point = this.patrolPath[i];
            const dist = PathFinder.heuristic(this, point);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPoint = point;
                this.patrolIndex = i;
            }
        }

        return nearestPoint;
    }

    /**
     * Возврат к ближайшей точке маршрута патрулирования
     * @param {Array} maze - лабиринт
     * @returns {Object} {y, x}
     */
    getReturnTarget(maze) {
        return this.syncPatrolIndex();
    }

    /**
     * Сообщение при поимке игрока стражем
     * @returns {string}
     */
    getCatchMessage() {
        return `💀 ПОРАЖЕНИЕ! Страж ${this.id} поймал вас!`;
    }

    /**
     * Сообщение при отбрасывании стража
     * @returns {string}
     */
    getRepelMessage() {
        return '🛡 Страж отброшен.';
    }

    /**
     * Переопределяем сброс состояния для стража
     * @param {Array} maze - лабиринт
     */
    resetState(maze) {
        this.chase = false;
        this.searching = false;
        this.loseCount = 0;
        this.returning = true;

        // Находим ближайшую точку на маршруте патрулирования
        const nearestPoint = this.syncPatrolIndex();

        this.returnPath = PathFinder.findPath(
            this,
            nearestPoint,
            maze,
            this.gameConfig.rows,
            this.gameConfig.cols
        );
    }
}