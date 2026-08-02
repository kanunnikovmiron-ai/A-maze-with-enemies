/**
 * Класс для отрисовки игры
 */
class Renderer {
    /**
     * @param {Game} game - объект игры
     */
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 30;
        this.viewCols = 15;      // Сколько клеток видно по горизонтали (камера)
        this.viewRows = 15;      // Сколько клеток видно по вертикали (камера)
        this.camX = 0;           // Смещение камеры по X (пиксели)
        this.camY = 0;           // Смещение камеры по Y (пиксели)
    }

    /**
     * Обновление камеры: держим игрока в центре экрана, не выходя за границы лабиринта
     * @param {number} viewW - ширина вьюпорта в пикселях
     * @param {number} viewH - высота вьюпорта в пикселях
     */
    updateCamera(viewW, viewH) {
        const { game, cellSize } = this;
        const worldW = game.cols * cellSize;
        const worldH = game.rows * cellSize;
        const px = game.player.x * cellSize + cellSize / 2;
        const py = game.player.y * cellSize + cellSize / 2;
        this.camX = Math.max(0, Math.min(px - viewW / 2, Math.max(0, worldW - viewW)));
        this.camY = Math.max(0, Math.min(py - viewH / 2, Math.max(0, worldH - viewH)));
    }

    /**
     * Основной метод отрисовки
     */
    draw() {
        const { game, canvas, ctx, cellSize } = this;

        // Вьюпорт: не больше самого лабиринта
        const viewCols = Math.min(this.viewCols, game.cols);
        const viewRows = Math.min(this.viewRows, game.rows);
        const viewW = viewCols * cellSize;
        const viewH = viewRows * cellSize;

        // Устанавливаем размер канваса (окно камеры)
        canvas.width = viewW;
        canvas.height = viewH;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Камера центрирует игрока
        this.updateCamera(viewW, viewH);

        ctx.save();
        ctx.translate(-this.camX, -this.camY);

        // Секретная комната рисуется отдельно (свой лабиринт и свет из трещины)
        if (game.inSecretRoom) {
            this.drawMaze();
            this.drawSecretRoom();
            this.drawPlayer();
            ctx.restore();
            this.updateUI();
            return;
        }

        // Отмечаем исследованные клетки (туман войны)
        this.updateExplored();

        // Рисуем все элементы игры
        this.drawMaze();
        this.drawTrails();
        this.drawLastSeenPositions();
        this.drawPatrolRoutes(); // Рисуем маршруты патрулирования
        this.drawFinish();
        this.drawKeys();
        this.drawHazards();
        this.drawEnemies();
        this.drawPlayer();
        this.drawSwingFlash();
        this.drawFog(); // Туман войны поверх всего

        ctx.restore();

        // Обновляем интерфейс
        this.updateUI();
    }

    /**
     * Обновление сетки исследованных клеток (туман войны)
     */
    updateExplored() {
        const game = this.game;
        if (!game.fogEnabled) return;

        const { y, x } = game.player;
        const r = game.fogVisionRadius;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny < 0 || ny >= game.rows || nx < 0 || nx >= game.cols) continue;
                if (Math.abs(dy) + Math.abs(dx) <= r) {
                    game.explored[ny][nx] = true;
                }
            }
        }
    }

    /**
     * Виден ли сейчас игроку фрагмент (туман войны)
     * @param {number} y - координата Y
     * @param {number} x - координата X
     * @returns {boolean}
     */
    isVisible(y, x) {
        const game = this.game;
        if (!game.fogEnabled) return true;
        const dist = Math.abs(game.player.y - y) + Math.abs(game.player.x - x);
        return dist <= game.fogVisionRadius;
    }

    /**
     * Исследована ли клетка ранее (запоминается навсегда)
     * @param {number} y - координата Y
     * @param {number} x - координата X
     * @returns {boolean}
     */
    isExplored(y, x) {
        const game = this.game;
        if (!game.fogEnabled) return true;
        return !!game.explored[y][x];
    }

    /**
     * Отрисовка тумана войны
     */
    drawFog() {
        const { game, ctx, cellSize } = this;
        if (!game.fogEnabled) return;

        for (let y = 0; y < game.rows; y++) {
            for (let x = 0; x < game.cols; x++) {
                if (!game.explored[y][x]) {
                    // Неисследованная клетка — полностью скрыта
                    ctx.fillStyle = '#05060a';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                } else if (!this.isVisible(y, x)) {
                    // Исследованная, но вне поля зрения — затемнена
                    ctx.fillStyle = 'rgba(0,0,0,0.35)';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    /**
     * Отрисовка лабиринта
     */
    drawMaze() {
        const { game, ctx, cellSize } = this;

        for (let y = 0; y < game.rows; y++) {
            for (let x = 0; x < game.cols; x++) {
                if (game.maze[y][x] === 1) {
                    // Рисуем каменную стену с фаской (на всех уровнях и в секретной комнате)
                    ctx.fillStyle = '#5d6a7a';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                    // Внутренняя часть стены (для эффекта 3D)
                    ctx.fillStyle = '#434d5c';
                    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);

                    // Светлая грань сверху/слева
                    ctx.fillStyle = '#7f8ea3';
                    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, 2);
                    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, 2, cellSize - 2);

                    // Тёмная грань снизу/справа
                    ctx.fillStyle = '#2b323d';
                    ctx.fillRect(x * cellSize + 1, y * cellSize + cellSize - 3, cellSize - 2, 2);
                    ctx.fillRect(x * cellSize + cellSize - 3, y * cellSize + 1, 2, cellSize - 2);

                    // Секретный проход (трещина) — только в основном лабиринте и если не использован
                    if (!game.inSecretRoom && game.secret && !game.secret.used &&
                        y === game.secret.entrance.y && x === game.secret.entrance.x) {
                        ctx.fillStyle = 'rgba(255, 220, 80, 0.25)';
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                        ctx.strokeStyle = 'rgba(255, 220, 80, 0.9)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x * cellSize + 6, y * cellSize + 24);
                        ctx.lineTo(x * cellSize + 12, y * cellSize + 16);
                        ctx.lineTo(x * cellSize + 10, y * cellSize + 10);
                        ctx.lineTo(x * cellSize + 20, y * cellSize + 6);
                        ctx.stroke();
                    }
                } else {
                    // Рисуем пол
                    ctx.fillStyle = '#111';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    /**
     * Отрисовка секретной комнаты: тёмный оверлей, свет из трещины и огоньков, бонус и портал
     */
    drawSecretRoom() {
        const { game, ctx, cellSize } = this;
        const secret = game.secret;
        if (!secret) return;

        const { rows, cols } = game;
        const r = game.CRACK_LIGHT_RADIUS;
        const lights = [
            { ...secret.light, radius: r, isCrack: true },
            ...(secret.lights || []).map(s => ({ ...s, radius: r })),
            { ...secret.pickupPos, radius: 1 }, // Огонёк под щитом — радиус 1
            { y: game.player.y, x: game.player.x, radius: 1, isPlayer: true } // Свет героя: стены вплотную видны
        ];

        // Тёмный оверлей: клетка затемняется, только если она дальше радиуса света от ВСЕХ источников
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const lit = lights.some(s =>
                    Math.abs(y - s.y) + Math.abs(x - s.x) <= s.radius
                );
                if (!lit) {
                    ctx.fillStyle = '#05060a';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Светлые пятна вокруг источников света (трещина + огоньки + щит)
        for (const s of lights) {
            const grad = ctx.createRadialGradient(
                s.x * cellSize + cellSize / 2,
                s.y * cellSize + cellSize / 2,
                cellSize * 0.3,
                s.x * cellSize + cellSize / 2,
                s.y * cellSize + cellSize / 2,
                cellSize * (s.radius + 1)
            );
            if (s.isPlayer) {
                grad.addColorStop(0, 'rgba(220, 235, 255, 0.4)');
                grad.addColorStop(1, 'rgba(220, 235, 255, 0)');
            } else if (s.isCrack) {
                grad.addColorStop(0, 'rgba(255, 235, 160, 0.55)');
                grad.addColorStop(1, 'rgba(255, 235, 160, 0)');
            } else if (s.radius === 1) {
                grad.addColorStop(0, 'rgba(255, 220, 120, 0.55)');
                grad.addColorStop(1, 'rgba(255, 220, 120, 0)');
            } else {
                grad.addColorStop(0, 'rgba(255, 180, 90, 0.5)');
                grad.addColorStop(1, 'rgba(255, 180, 90, 0)');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
        }

        // Источник света — трещина в стене (над клеткой перед входом)
        const light = secret.light;
        ctx.fillStyle = 'rgba(255, 230, 120, 0.9)';
        ctx.beginPath();
        ctx.moveTo(light.x * cellSize + 8, light.y * cellSize - 2);
        ctx.lineTo(light.x * cellSize + 14, light.y * cellSize + 6);
        ctx.lineTo(light.x * cellSize + 12, light.y * cellSize - 2);
        ctx.closePath();
        ctx.fill();

        // Огоньки — маленькие светящиеся шарики
        for (const s of secret.lights || []) {
            const cx = s.x * cellSize + cellSize / 2;
            const cy = s.y * cellSize + cellSize / 2;
            const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, cellSize * 0.7);
            glow.addColorStop(0, 'rgba(255, 220, 140, 1)');
            glow.addColorStop(0.5, 'rgba(255, 160, 60, 0.8)');
            glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Бонус — меч (если ещё не забран)
        if (!secret.used) {
            const { x, y } = secret.pickupPos;

            // Свечение под мечом
            const cx = x * cellSize + cellSize / 2;
            const cy = y * cellSize + cellSize / 2;
            const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, cellSize * 0.6);
            glow.addColorStop(0, 'rgba(255, 240, 170, 0.95)');
            glow.addColorStop(0.5, 'rgba(255, 200, 90, 0.55)');
            glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 200, 0, 0.35)';
            ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.fillText('⚔', x * cellSize + 7, y * cellSize + 21);
        }

        // Портал выхода (клетка входа)
        const { x: px, y: py } = secret.entryPos;
        ctx.strokeStyle = 'rgba(80, 220, 120, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(px * cellSize + 4, py * cellSize + 4, cellSize - 8, cellSize - 8);
        ctx.setLineDash([]);
        ctx.fillStyle = '#8f8';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('ВЫХОД', px * cellSize + 4, py * cellSize + 19);
    }

    /**
     * Отрисовка маршрутов патрулирования
     */
    drawPatrolRoutes() {
        const { game, ctx, cellSize } = this;

        for (const enemy of game.enemies) {
            if (enemy.type === 'patrol' && enemy.patrolPath && enemy.patrolPath.length > 1) {
                // Маршрут виден, только если сам страж в поле зрения (туман)
                if (!this.isVisible(enemy.y, enemy.x)) continue;

                // Рисуем линии маршрута
                ctx.strokeStyle = 'rgba(128, 0, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);

                ctx.beginPath();
                ctx.moveTo(
                    enemy.patrolPath[0].x * cellSize + cellSize / 2,
                    enemy.patrolPath[0].y * cellSize + cellSize / 2
                );

                for (let i = 1; i < enemy.patrolPath.length; i++) {
                    ctx.lineTo(
                        enemy.patrolPath[i].x * cellSize + cellSize / 2,
                        enemy.patrolPath[i].y * cellSize + cellSize / 2
                    );
                }

                // Замыкаем маршрут
                ctx.lineTo(
                    enemy.patrolPath[0].x * cellSize + cellSize / 2,
                    enemy.patrolPath[0].y * cellSize + cellSize / 2
                );

                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    /**
     * Отрисовка следов врагов
     */
    drawTrails() {
        const { game, ctx, cellSize } = this;

        for (let i = 0; i < game.enemies.length; i++) {
            const enemy = game.enemies[i];

            for (let j = 0; j < enemy.trail.length; j++) {
                const t = enemy.trail[j];
                // След виден только на исследованных/видимых клетках (туман)
                if (!this.isExplored(t.y, t.x)) continue;

                // Прозрачность увеличивается от старых следов к новым
                const alpha = 0.06 + (j / enemy.trail.length) * 0.25;

                // Цвета для разных врагов
                const colors = [
                    'rgba(255,50,50,' + alpha + ')',   // Красный для первого врага
                    'rgba(255,130,30,' + alpha + ')',  // Оранжевый для второго
                    'rgba(255,200,40,' + alpha + ')',  // Желтый для третьего
                    'rgba(255,80,255,' + alpha + ')'   // Фиолетовый для четвертого
                ];

                // Яркие следы при преследовании/поиске, тусклые при патрулировании
                ctx.fillStyle = (t.chase || t.searching)
                    ? colors[i % colors.length]
                    : colors[i % colors.length].replace(/[\d.]+\)$/, (alpha * 0.4) + ')');

                // Рисуем след в центре клетки
                ctx.fillRect(
                    t.x * cellSize + 7,
                    t.y * cellSize + 7,
                    cellSize - 14,
                    cellSize - 14
                );
            }
        }
    }

    /**
     * Отрисовка последних позиций, где враги видели игрока
     */
    drawLastSeenPositions() {
        const { game, ctx, cellSize } = this;

        for (const enemy of game.enemies) {
            if (enemy.lastSeenPos) {
                // Маркер виден только в поле зрения (туман)
                if (!this.isVisible(enemy.lastSeenPos.y, enemy.lastSeenPos.x)) continue;

                // Рисуем желтую пунктирную рамку
                ctx.strokeStyle = 'rgba(255,255,0,0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(
                    enemy.lastSeenPos.x * cellSize + 2,
                    enemy.lastSeenPos.y * cellSize + 2,
                    cellSize - 4,
                    cellSize - 4
                );
                ctx.setLineDash([]);
            }
        }
    }

    /**
     * Отрисовка финиша
     */
    drawFinish() {
        const { game, ctx, cellSize } = this;
        const { x, y } = game.finish;

        // Финиш виден, только если клетка исследована (туман)
        if (!this.isExplored(y, x)) return;

        const locked = game.isFinishLocked();
        const keysMissing = game.keyConfig.enabled && !game.hasAllKeys();

        // Фон финиша
        ctx.fillStyle = locked ? game.finishConfig.lockedBgColor : game.finishConfig.openBgColor;
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);

        // Внутренний квадрат финиша
        ctx.fillStyle = locked ? game.finishConfig.lockedColor : game.finishConfig.openColor;
        ctx.fillRect(x * cellSize + 5, y * cellSize + 5, cellSize - 10, cellSize - 10);

        // Текст на финише
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        let text;
        if (game.boss && !game.boss.defeated) {
            text = '👹';
        } else if (keysMissing) {
            text = '🔑';
        } else if (locked) {
            text = '🔒';
        } else {
            text = game.finishConfig.lockWhenChased ? '🔓' : game.finishConfig.symbol;
        }
        ctx.fillText(text, x * cellSize + 4, y * cellSize + 22);
    }

    /**
     * Отрисовка частей ключа
     */
    drawKeys() {
        const { game, ctx, cellSize } = this;
        if (!game.keyConfig.enabled) return;

        for (let i = 0; i < game.keys.length; i++) {
            const k = game.keys[i];
            if (k.collected) continue;
            // Часть ключа видна, только если клетка исследована (туман)
            if (!this.isExplored(k.y, k.x)) continue;

            const x = k.x * cellSize + 3;
            const y = k.y * cellSize + 3;
            const s = cellSize - 6;

            // Фон части ключа (первая — золото, вторая — серебро)
            ctx.fillStyle = i === 0 ? game.keyConfig.color1 : game.keyConfig.color2;
            ctx.fillRect(x, y, s, s);

            // Обводка
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

            // Иконка ключа
            ctx.fillStyle = '#111';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(game.keyConfig.symbol, k.x * cellSize + 8, k.y * cellSize + 20);
        }
    }

    /**
     * Отрисовка опасных клеток босса (предупреждение ⚠ и огонь 🔥)
     */
    drawHazards() {
        const { game, ctx, cellSize } = this;

        for (const h of game.hazards) {
            // Клетка видна, только если исследована (туман)
            if (!this.isExplored(h.y, h.x)) continue;

            const x = h.x * cellSize;
            const y = h.y * cellSize;

            if (h.phase === 'warn') {
                // Предупреждение: жёлтая клетка с рамкой
                ctx.fillStyle = 'rgba(255, 200, 0, 0.35)';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                ctx.strokeStyle = '#fa0';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                ctx.fillStyle = '#fa0';
                ctx.font = 'bold 14px Arial';
                ctx.fillText('⚠', x + 7, y + 22);
            } else {
                // Огонь: красно-оранжевая клетка с языком пламени
                ctx.fillStyle = '#b33';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                ctx.fillStyle = '#f66';
                ctx.font = 'bold 16px Arial';
                ctx.fillText('🔥', x + 6, y + 23);
            }
        }
    }

    /**
     * Отрисовка врагов
     */
    drawEnemies() {
        const { game, ctx, cellSize } = this;

        for (const enemy of game.enemies) {
            // Враг виден, только если в поле зрения (туман)
            if (!this.isVisible(enemy.y, enemy.x)) continue;

            const ex = enemy.x * cellSize + cellSize / 2;
            const ey = enemy.y * cellSize + cellSize / 2;
            const r = cellSize / 2 - 3;

            // Проверяем тип врага
            if (enemy.type === 'boss') {
                // Босс занимает блок 2x2 — центр блока
                const bex = (enemy.x + 1) * cellSize;
                const bey = (enemy.y + 1) * cellSize;
                this.drawBossEnemy(enemy, bex, bey, cellSize - 4);
            } else if (enemy.type === 'patrol') {
                // Рисуем треугольного стража с его цветами
                this.drawTriangleEnemy(enemy, ex, ey, r);
            } else {
                // Рисуем обычного круглого врага с его цветами
                this.drawCircleEnemy(enemy, ex, ey, r);
            }

            // Счетчик ожидания (если враг ждет)
            if (enemy.loseCount > 0 && !enemy.returning) {
                ctx.fillStyle = '#ff0';
                ctx.font = 'bold 8px Arial';
                ctx.fillText(`-${enemy.loseCount}`, ex - 5, ey - r + 6);
            }
        }
    }

    /**
     * Отрисовка круглого врага
     */
    drawCircleEnemy(enemy, ex, ey, r) {
        const { ctx } = this;

        // Определяем цвет и свечение в зависимости от состояния врага
        this.setEnemyStyle(enemy);

        // Рисуем круг врага
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, Math.PI * 2);
        ctx.fill();

        // Сбрасываем свечение
        ctx.shadowBlur = 0;

        // Обводка врага
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ID врага в центре
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Arial';
        ctx.fillText(enemy.id, ex - 8, ey + 3);
    }

    /**
     * Отрисовка треугольного врага (стража)
     */
    drawTriangleEnemy(enemy, ex, ey, r) {
        const { ctx } = this;

        // Определяем цвет и свечение
        this.setEnemyStyle(enemy);

        // Рисуем треугольник (направлен вверх)
        ctx.beginPath();
        ctx.moveTo(ex, ey - r);              // Верхняя вершина
        ctx.lineTo(ex - r, ey + r * 0.7);    // Левая нижняя вершина
        ctx.lineTo(ex + r, ey + r * 0.7);    // Правая нижняя вершина
        ctx.closePath();
        ctx.fill();

        // Сбрасываем свечение
        ctx.shadowBlur = 0;

        // Обводка треугольника
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ID стража внутри треугольника
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial';
        ctx.fillText(enemy.id, ex - 7, ey + 1);
    }

    /**
     * Отрисовка босса: чёрный шестиугольник с полоской HP (стадия 2 — огненно-красный)
     */
    drawBossEnemy(enemy, ex, ey, r) {
        const { ctx, cellSize } = this;
        const stage2 = enemy.stage === 2;

        // Свечение при погоне (стадия 2 — оранжевое и сильнее)
        ctx.shadowColor = stage2 ? '#f50' : '#900';
        ctx.shadowBlur = enemy.chase ? (stage2 ? 16 : 12) : 4;

        // Правильный шестиугольник
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = ex + (r + 2) * Math.cos(angle);
            const py = ey + (r + 2) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.shadowBlur = 0;

        // Чёрное тело (поверженный — серый, стадия 2 — тёмно-красный)
        ctx.fillStyle = enemy.defeated ? '#444' : (stage2 ? '#3a0500' : '#0a0a0a');
        ctx.fill();
        ctx.strokeStyle = enemy.defeated ? '#888' : (stage2 ? '#f66' : '#a33');
        ctx.lineWidth = 2;
        ctx.stroke();

        // ID босса в центре
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Arial';
        ctx.fillText(enemy.id, ex - 8, ey + 3);

        // Значок поверженного
        if (enemy.defeated) {
            ctx.fillStyle = '#f66';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('💀', ex - 7, ey - r - 6);
        }

        // Полоска HP над шестиугольником (на всю ширину блока 2x2)
        const barWidth = cellSize * 2 - 8;
        const barX = ex - barWidth / 2;
        const barY = Math.max(1, ey - r - 8);
        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barWidth, 5);
        for (let i = 0; i < enemy.maxHp; i++) {
            const segW = (barWidth - 2) / enemy.maxHp;
            const segColor = enemy.hp === 1 ? '#f55' : (stage2 ? '#fa0' : '#5f5');
            ctx.fillStyle = i < enemy.hp ? segColor : '#333';
            ctx.fillRect(barX + 1 + i * segW, barY + 1, segW - 1, 3);
        }
    }

    /**
     * Установка стиля врага в зависимости от состояния
     */
    setEnemyStyle(enemy) {
        const { ctx } = this;

        // Определяем цвет и свечение в зависимости от состояния врага
        if (enemy.chase) {
            // Преследование - красный с сильным свечением
            ctx.fillStyle = enemy.config.colors.chase;
            ctx.shadowColor = enemy.config.glows.chase.color;
            ctx.shadowBlur = enemy.config.glows.chase.blur;
        } else if (enemy.searching) {
            // Поиск - оранжевый/розовый со средним свечением
            ctx.fillStyle = enemy.config.colors.searching;
            ctx.shadowColor = enemy.config.glows.searching.color;
            ctx.shadowBlur = enemy.config.glows.searching.blur;
        } else if (enemy.loseCount > 0 && !enemy.returning) {
            // Ожидание - с легким свечением
            ctx.fillStyle = enemy.config.colors.waiting;
            ctx.shadowColor = enemy.config.glows.waiting.color;
            ctx.shadowBlur = enemy.config.glows.waiting.blur;
        } else if (enemy.returning) {
            // Возврат - без свечения
            ctx.fillStyle = enemy.config.colors.returning;
            ctx.shadowColor = enemy.config.glows.returning.color;
            ctx.shadowBlur = enemy.config.glows.returning.blur;
        } else {
            // Патрулирование - с легким свечением
            ctx.fillStyle = enemy.config.colors.patrol;
            ctx.shadowColor = enemy.config.glows.patrol.color;
            ctx.shadowBlur = enemy.config.glows.patrol.blur;
        }
    }

    /**
     * Отрисовка игрока
     */
    drawPlayer() {
        const { game, ctx, cellSize } = this;
        const { x, y } = game.player;
        const config = game.player.config;

        // Временная неуязвимость (секретка) — золотые цвета, как у постоянной
        const invincible = game.player.isInvincible();
        const bgColor = invincible ? '#4a3a1a' : config.bgColor;
        const color = invincible ? '#fa0' : config.color;

        // Фон игрока (меняется при неуязвимости)
        ctx.fillStyle = bgColor;
        ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);

        // Внутренний квадрат игрока
        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize + 5, y * cellSize + 5, cellSize - 10, cellSize - 10);

        // Обводка игрока
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);

        // Символ игрока
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(config.symbol, x * cellSize + 8, y * cellSize + 21);

        // Иконка меча, если он есть
        if (game.player.hasSword) {
            ctx.fillStyle = '#ffd';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('⚔', x * cellSize + cellSize - 10, y * cellSize + 13);
        }
    }

    /**
     * Текстурка удара меча: огненный энергетический серп-росчерк,
     * выгнутый по направлению взмаха (вплоть до клетки цели)
     */
    drawSwingFlash() {
        const { game, ctx, cellSize } = this;
        const flash = game.swingFlash;
        if (!flash) return;
        const px = flash.x * cellSize + cellSize / 2;
        const py = flash.y * cellSize + cellSize / 2;
        // Направление взмаха (по умолчанию — вправо)
        const dx = flash.dx || 1;
        const dy = flash.dy || 0;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Свечение росчерка
        ctx.shadowColor = 'rgba(255, 60, 40, 0.9)';
        ctx.shadowBlur = 12;

        // Главная дуга серпа (радиус, размах, толщина)
        const arcR = cellSize * 0.42;
        const arcW = cellSize * 0.42;
        const startA = -Math.PI * 0.55;
        const endA = Math.PI * 0.55;

        // Огненный градиент поперёк дуги
        const grad = ctx.createLinearGradient(0, -arcR, 0, arcR);
        grad.addColorStop(0, '#ffd27f');
        grad.addColorStop(0.5, '#ff6a1f');
        grad.addColorStop(1, '#c81e00');
        ctx.strokeStyle = grad;
        ctx.lineWidth = arcW;
        ctx.beginPath();
        ctx.arc(0, 0, arcR, startA, endA);
        ctx.stroke();

        // Горячее белое ядро росчерка
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255, 250, 235, 0.95)';
        ctx.lineWidth = cellSize * 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, arcR, startA + 0.08, endA - 0.08);
        ctx.stroke();

        // Искры у концов дуги
        ctx.fillStyle = '#fff';
        for (const a of [startA, endA]) {
            ctx.beginPath();
            ctx.arc(Math.cos(a) * (arcR + arcW * 0.35), Math.sin(a) * (arcR + arcW * 0.35), cellSize * 0.05, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    /**
     * Обновление UI элементов (сообщения, заголовки)
     */
    updateUI() {
        const msgElement = document.getElementById('msg');
        const levelDisplay = document.getElementById('levelNumDisplay');
        const titleElement = document.getElementById('game-title');

        // Обновляем здоровье игрока (сердечки)
        const hpDisplay = document.getElementById('playerHpDisplay');
        if (hpDisplay) {
            const hp = this.game.player.hp;
            const maxHp = this.game.player.maxHp;
            const hearts = '❤'.repeat(hp) + '🖤'.repeat(Math.max(0, maxHp - hp));
            hpDisplay.textContent = `❤ Здоровье: ${hearts} (${hp}/${maxHp})`;
        }

        // Обновляем сообщение
        msgElement.innerHTML = this.game.message;

        // Обновляем номер уровня
        levelDisplay.textContent = this.game.levelIndex + 1;

        // Обновляем заголовок игры
        const level = LEVELS[this.game.levelIndex];
        titleElement.textContent = `🏰 ${level.name} (${this.game.levelIndex + 1}/${LEVELS.length})`;

        // Устанавливаем CSS-класс для стилизации сообщения
        if (this.game.message.includes('ПОБЕДА')) {
            msgElement.className = 'info win';
        } else if (this.game.message.includes('ПОРАЖЕНИЕ')) {
            msgElement.className = 'info lose';
        } else if (this.game.message.includes('🔒')) {
            msgElement.className = 'info locked';
        } else if (this.game.message.includes('🔑') && !this.game.message.includes('🔓')) {
            msgElement.className = 'info warn';
        } else if (this.game.message.includes('🔓') || this.game.message.includes('открыт')) {
            msgElement.className = 'info win';
        } else {
            msgElement.className = 'info';
        }

        // Показываем/скрываем панель конца игры
        const endScreen = document.getElementById('end-screen');
        if (this.game.gameOver) {
            this.game.stopSecretMusic();
            this.game.stopBossMusic();
            const win = this.game.message.includes('ПОБЕДА');
            document.getElementById('end-title').textContent = win ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ!';
            document.getElementById('end-subtitle').textContent = win
                ? (this.game.levelIndex === LEVELS.length - 1
                    ? 'Все уровни пройдены!'
                    : 'Отличная работа! Следующий уровень ждёт.')
                : this.game.message;
            document.getElementById('next-level-btn').style.display =
                (win && this.game.levelIndex < LEVELS.length - 1) ? 'block' : 'none';
            endScreen.classList.remove('hidden');
        } else {
            endScreen.classList.add('hidden');
        }
    }
}