/**
 * Класс для работы с алгоритмом A* (поиск кратчайшего пути)
 */
class PathFinder {
    /**
     * Эвристическая функция (Манхэттенское расстояние)
     * @param {Object} a - точка {y, x}
     * @param {Object} b - точка {y, x}
     * @returns {number} расстояние
     */
    static heuristic(a, b) {
        return Math.abs(a.y - b.y) + Math.abs(a.x - b.x);
    }

    /**
     * Проверка проходимости клетки
     * @param {number} y - координата Y
     * @param {number} x - координата X
     * @param {Array} maze - лабиринт
     * @param {number} rows - количество строк
     * @param {number} cols - количество столбцов
     * @returns {boolean} проходима ли клетка
     */
    static isPassable(y, x, maze, rows, cols) {
        return y >= 0 && y < rows && x >= 0 && x < cols && maze[y][x] !== 1;
    }

    /**
     * Поиск кратчайшего пути от start до goal
     * @param {Object} start - начальная точка {y, x}
     * @param {Object} goal - конечная точка {y, x}
     * @param {Array} maze - лабиринт
     * @param {number} rows - количество строк
     * @param {number} cols - количество столбцов
     * @returns {Array|null} массив точек пути или null
     */
    static findPath(start, goal, maze, rows, cols) {
        // Проверяем, проходимы ли начальная и конечная точки
        if (!this.isPassable(start.y, start.x, maze, rows, cols) ||
            !this.isPassable(goal.y, goal.x, maze, rows, cols)) {
            return null;
        }

        // Функция для создания уникального ключа точки
        const key = (y, x) => y * cols + x;
        const startKey = key(start.y, start.x);

        // Открытый список (точки для исследования)
        const open = [{
            y: start.y,
            x: start.x,
            f: this.heuristic(start, goal) // f = g + h
        }];

        // Закрытый список (уже исследованные точки)
        const closed = new Set();

        // Словарь родительских точек для восстановления пути
        const parent = {};

        // Стоимость пути от старта до каждой точки
        const g = { [startKey]: 0 };

        // Основной цикл A*
        while (open.length > 0) {
            // Сортируем по f и берем точку с наименьшей стоимостью
            open.sort((a, b) => a.f - b.f);
            const cur = open.shift();
            const curKey = key(cur.y, cur.x);

            // Если достигли цели - восстанавливаем путь
            if (cur.y === goal.y && cur.x === goal.x) {
                const path = [];
                let k = curKey;
                while (k !== startKey) {
                    path.unshift({
                        y: Math.floor(k / cols),
                        x: k % cols
                    });
                    k = parent[k];
                }
                return path;
            }

            // Пропускаем уже исследованные точки
            if (closed.has(curKey)) continue;
            closed.add(curKey);

            // Проверяем всех соседей (4 направления)
            for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;

                // Пропускаем непроходимые клетки
                if (!this.isPassable(ny, nx, maze, rows, cols)) continue;

                const nKey = key(ny, nx);
                if (closed.has(nKey)) continue;

                // Вычисляем новую стоимость пути
                const ng = g[curKey] + 1;

                // Если нашли лучший путь или точка новая - обновляем
                if (g[nKey] === undefined || ng < g[nKey]) {
                    g[nKey] = ng;
                    parent[nKey] = curKey;
                    open.push({
                        y: ny,
                        x: nx,
                        f: ng + this.heuristic({ y: ny, x: nx }, goal)
                    });
                }
            }
        }

        return null; // Путь не найден
    }
}