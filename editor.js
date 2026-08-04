/**
 * Редактор уровней.
 * Канвас-редактор: стены, старт/финиш, враги, босс, ключи, меч, бафы, трещина.
 * Работает только при наличии #editor-screen (иначе все методы безопасно пустые).
 */
const EDITOR_CELL = 30;

const editorState = {
    size: 15,
    maze: null,
    start: null,
    finish: null,
    placements: [],
    secretEntrance: null,
    secretBossEntrance: null,
    tool: 'wall',
    dragging: false,
    previewArena: false,
    _initialized: false
};

/**
 * Пустой лабиринт с бортиком-стеной по периметру
 */
function newBlankMaze(size) {
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
 * Инициализация редактора (вызывается из showEditor)
 */
function initEditorUI() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;

    if (!editorState._initialized) {
        editorState._initialized = true;
        buildEditorPalette();

        canvas.addEventListener('mousedown', editorMouseDown);
        canvas.addEventListener('mousemove', editorMouseMove);
        canvas.addEventListener('mouseup', editorMouseUp);
        window.addEventListener('mouseup', () => { editorState.dragging = false; });

        canvas.addEventListener('touchstart', editorTouchStart, { passive: false });
        canvas.addEventListener('touchmove', editorTouchMove, { passive: false });
        canvas.addEventListener('touchend', () => { editorState.dragging = false; }, { passive: true });
    }

    // Редактор редактирует единственный сохранённый уровень (или пустую сетку)
    if (CUSTOM_LEVELS[0]) {
        loadLevelIntoEditor(CUSTOM_LEVELS[0]);
    } else {
        editorNew();
    }
    drawEditor();
}

/**
 * Построение палитры из PLACEMENT_TYPES
 */
function buildEditorPalette() {
    const pal = document.getElementById('editor-palette');
    if (!pal) return;
    pal.innerHTML = PLACEMENT_ORDER.map(t => {
        const def = PLACEMENT_TYPES[t];
        return `<div class="editor-tool" id="editor-tool-${t}" onclick="selectEditorTool('${t}')" title="${def.label}">${def.icon}<span class="tip">${def.label}</span></div>`;
    }).join('');
    selectEditorTool('wall');
}

/**
 * Выбор инструмента палитры
 */
function selectEditorTool(t) {
    if (!PLACEMENT_TYPES[t]) return;
    editorState.tool = t;
    editorState.previewArena = false;
    document.querySelectorAll('.editor-tool').forEach(el => el.classList.remove('active'));
    const el = document.getElementById('editor-tool-' + t);
    if (el) el.classList.add('active');
    if (t === 'secretBoss') {
        setEditorMessage('💗 Кликните по проходимой клетке — сердце появится на карте. Можно несколько.');
    } else if (t === 'secretBossArena') {
        setEditorMessage('💥 Кликните по стене лабиринта — трещина ведёт на арену секретного босса.');
    }
}

/**
 * Клетка под координатами клика
 */
function editorCellFromCoords(clientX, clientY) {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX / EDITOR_CELL);
    const y = Math.floor((clientY - rect.top) * scaleY / EDITOR_CELL);
    if (y < 0 || y >= editorState.size || x < 0 || x >= editorState.size) return null;
    return { y, x };
}

function editorMouseDown(e) {
    e.preventDefault();
    editorState.dragging = true;
    const c = editorCellFromCoords(e.clientX, e.clientY);
    if (c) applyEditorTool(c.y, c.x);
    drawEditor();
}

function editorMouseMove(e) {
    if (!editorState.dragging) return;
    const c = editorCellFromCoords(e.clientX, e.clientY);
    if (c) applyEditorTool(c.y, c.x);
    drawEditor();
}

function editorMouseUp() {
    editorState.dragging = false;
}

function editorTouchStart(e) {
    e.preventDefault();
    editorState.dragging = true;
    const t = e.touches[0];
    const c = editorCellFromCoords(t.clientX, t.clientY);
    if (c) applyEditorTool(c.y, c.x);
    drawEditor();
}

function editorTouchMove(e) {
    e.preventDefault();
    if (!editorState.dragging) return;
    const t = e.touches[0];
    const c = editorCellFromCoords(t.clientX, t.clientY);
    if (c) applyEditorTool(c.y, c.x);
    drawEditor();
}

/**
 * Накрывает ли блок босса (by,bx) клетку (y,x)
 */
function bossCovers(by, bx, y, x) {
    return y >= by && y <= by + 1 && x >= bx && x <= bx + 1;
}

/**
 * Применение текущего инструмента к клетке (y,x)
 */
function applyEditorTool(y, x) {
    const t = editorState.tool;
    const maze = editorState.maze;
    const size = editorState.size;

    if (editorState.previewArena) {
        editorState.previewArena = false;
        const btn = document.getElementById('editor-preview-arena');
        if (btn) btn.classList.remove('active');
        setEditorMessage('');
    }

    const removeAt = (yy, xx) => {
        editorState.placements = editorState.placements.filter(p => !(p.y === yy && p.x === xx));
    };
    const removeBossCovering = (yy, xx) => {
        editorState.placements = editorState.placements.filter(p => p.type !== 'boss' || !bossCovers(p.y, p.x, yy, xx));
    };

    if (t === 'wall') {
        if (maze[y][x] === 1) return;
        maze[y][x] = 1;
        removeAt(y, x);
        removeBossCovering(y, x);
        if (editorState.secretEntrance && editorState.secretEntrance.y === y && editorState.secretEntrance.x === x) {
            editorState.secretEntrance = null;
        }
        if (editorState.secretBossEntrance && editorState.secretBossEntrance.y === y && editorState.secretBossEntrance.x === x) {
            editorState.secretBossEntrance = null;
        }
        return;
    }

    if (t === 'erase') {
        maze[y][x] = 0;
        removeAt(y, x);
        removeBossCovering(y, x);
        if (editorState.secretEntrance && editorState.secretEntrance.y === y && editorState.secretEntrance.x === x) {
            editorState.secretEntrance = null;
        }
        if (editorState.secretBossEntrance && editorState.secretBossEntrance.y === y && editorState.secretBossEntrance.x === x) {
            editorState.secretBossEntrance = null;
        }
        return;
    }

    if (t === 'start') {
        editorState.start = { y, x };
        return;
    }

    if (t === 'finish') {
        editorState.finish = { y, x };
        return;
    }

    if (t === 'secret') {
        if (maze[y][x] !== 1) return;
        editorState.secretEntrance = { y, x };
        if (editorState.secretBossEntrance &&
            editorState.secretBossEntrance.y === y && editorState.secretBossEntrance.x === x) {
            editorState.secretBossEntrance = null;
        }
        return;
    }

    if (t === 'secretBossArena') {
        if (maze[y][x] !== 1) return;
        editorState.secretBossEntrance = { y, x };
        if (editorState.secretEntrance &&
            editorState.secretEntrance.y === y && editorState.secretEntrance.x === x) {
            editorState.secretEntrance = null;
        }
        return;
    }

    // Объекты размещения требуют проходимой клетки
    const type = PLACEMENT_TYPES[t];
    if (!type || maze[y][x] === 1) return;

    // Уникальные объекты (меч, босс) перемещаются на новую клетку
    if (type.single) {
        editorState.placements = editorState.placements.filter(p => p.type !== t);
    }

    if (t === 'boss') {
        if (y + 1 >= size || x + 1 >= size) return;
        for (const [dy, dx] of [[0,0],[0,1],[1,0],[1,1]]) {
            if (maze[y + dy][x + dx] === 1) return;
        }
        // Убираем placements внутри блока 2x2
        editorState.placements = editorState.placements.filter(p => !bossCovers(y, x, p.y, p.x));
    }

    removeAt(y, x);
    editorState.placements.push({ type: t, y, x });
}

/**
 * Отрисовка редактора на канвасе
 */
function drawEditor() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = editorState.size;
    const cell = EDITOR_CELL;

    if (editorState.previewArena && editorState.secretBossEntrance) {
        drawArenaPreview();
        return;
    }

    canvas.width = size * cell;
    canvas.height = size * cell;
    const maze = editorState.maze;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#5d6a7a';
                ctx.fillRect(x * cell, y * cell, cell, cell);
                ctx.fillStyle = '#434d5c';
                ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
                if (editorState.secretEntrance &&
                    editorState.secretEntrance.y === y && editorState.secretEntrance.x === x) {
                    ctx.fillStyle = 'rgba(255, 220, 80, 0.45)';
                    ctx.fillRect(x * cell, y * cell, cell, cell);
                }
                if (editorState.secretBossEntrance &&
                    editorState.secretBossEntrance.y === y && editorState.secretBossEntrance.x === x) {
                    ctx.fillStyle = 'rgba(255, 80, 200, 0.45)';
                    ctx.fillRect(x * cell, y * cell, cell, cell);
                    ctx.strokeStyle = '#f4f';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px Arial';
                    ctx.fillText('💗', x * cell + 7, y * cell + 21);
                }
            } else {
                ctx.fillStyle = '#111';
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }
    }

    drawEditorMarker(editorState.start, 'S', '#4f4');
    drawEditorMarker(editorState.finish, 'F', '#4a4');

    for (const p of editorState.placements) {
        const t = PLACEMENT_TYPES[p.type] || {};
        if (p.type === 'boss') {
            ctx.fillStyle = 'rgba(170, 60, 60, 0.5)';
            ctx.fillRect(p.x * cell, p.y * cell, cell * 2, cell * 2);
            ctx.strokeStyle = '#f66';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x * cell + 2, p.y * cell + 2, cell * 2 - 4, cell * 2 - 4);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(t.icon || '👹', p.x * cell + cell - 10, p.y * cell + cell + 7);
        } else {
            ctx.fillStyle = t.color || '#888';
            ctx.fillRect(p.x * cell + 3, p.y * cell + 3, cell - 6, cell - 6);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x * cell + 3, p.y * cell + 3, cell - 6, cell - 6);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(t.icon || '?', p.x * cell + 8, p.y * cell + 21);
        }
    }
}

/**
 * Переключение превью арены секретного босса
 */
function editorToggleArenaPreview() {
    editorState.previewArena = !editorState.previewArena;
    const btn = document.getElementById('editor-preview-arena');
    if (btn) btn.classList.toggle('active', editorState.previewArena);
    if (editorState.previewArena && !editorState.secretBossEntrance) {
        editorState.previewArena = false;
        if (btn) btn.classList.remove('active');
        setEditorMessage('❌ Сначала поставьте трещину 💗 на стену.');
        drawEditor();
        return;
    }
    if (editorState.previewArena) {
        setEditorMessage('💗 Превью арены: сердце босса по центру, портал-выход у входа.');
    } else {
        setEditorMessage('');
    }
    drawEditor();
}

/**
 * Отрисовка превью арены секретного босса (открытое поле 15×15, сердце, портал)
 */
function drawArenaPreview() {
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 15;
    const cell = EDITOR_CELL;
    canvas.width = size * cell;
    canvas.height = size * cell;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const wall = y === 0 || y === size - 1 || x === 0 || x === size - 1;
            if (wall) {
                ctx.fillStyle = '#5d6a7a';
                ctx.fillRect(x * cell, y * cell, cell, cell);
                ctx.fillStyle = '#434d5c';
                ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
            } else {
                ctx.fillStyle = '#111';
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
        }
    }

    const cx = 7 * cell + cell / 2;
    const cy = 7 * cell + cell / 2;
    const s = cell * 0.42;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, cell * 0.8);
    glow.addColorStop(0, 'rgba(255, 60, 150, 0.7)');
    glow.addColorStop(1, 'rgba(255, 60, 150, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.8, 0, Math.PI * 2);
    ctx.fill();

    const cx0 = cx;
    const cy0 = cy - 3;
    ctx.fillStyle = '#ff4d8d';
    ctx.beginPath();
    ctx.arc(cx0 - s * 0.45, cy0 - s * 0.2, s * 0.5, 0, Math.PI * 2);
    ctx.arc(cx0 + s * 0.45, cy0 - s * 0.2, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx0 - s, cy0 + s * 0.1);
    ctx.quadraticCurveTo(cx0 - s * 0.5, cy0 + s * 1.1, cx0, cy0 + s * 1.3);
    ctx.quadraticCurveTo(cx0 + s * 0.5, cy0 + s * 1.1, cx0 + s, cy0 + s * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#ff8';
    ctx.textAlign = 'center';
    ctx.fillText('❤ 10/10', cx, cy + cell * 0.55);
    ctx.textAlign = 'start';

    const px = 1 * cell + cell / 2;
    const py = 1 * cell + cell / 2;
    ctx.strokeStyle = 'rgba(255, 80, 180, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(1 * cell + 4, 1 * cell + 4, cell - 8, cell - 8);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f9a';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ВЫХОД', px, py);
    ctx.textAlign = 'start';

    ctx.fillStyle = '#999';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('АРЕНА 15×15 — сердце по центру', 4, size * cell - 6);
}

/**
 * Отрисовка маркера (старт/финиш)
 */
function drawEditorMarker(pos, label, color) {
    if (!pos) return;
    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cell = EDITOR_CELL;
    ctx.fillStyle = color;
    ctx.fillRect(pos.x * cell + 3, pos.y * cell + 3, cell - 6, cell - 6);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pos.x * cell + 3, pos.y * cell + 3, cell - 6, cell - 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(label, pos.x * cell + 9, pos.y * cell + 21);
}

/**
 * Новый пустой уровень
 */
function editorNew() {
    const size = editorState.size;
    editorState.maze = newBlankMaze(size);
    editorState.start = { y: 1, x: 1 };
    editorState.finish = { y: size - 2, x: size - 2 };
    editorState.placements = [];
    editorState.secretEntrance = null;
    editorState.secretBossEntrance = null;
    editorState.previewArena = false;
    const nameEl = document.getElementById('editor-name');
    if (nameEl) nameEl.value = 'Мой уровень';
    setEditorMessage('');
    drawEditor();
}

/**
 * Смена размера лабиринта
 */
function editorSetSize(v) {
    const s = parseInt(v, 10);
    if (s !== 15 && s !== 20) return;
    editorState.size = s;
    editorNew();
}

/**
 * Сборка объекта уровня из состояния редактора
 */
function buildLevelFromEditor() {
    const placements = editorState.placements.map(p => ({ type: p.type, y: p.y, x: p.x }));
    const nameEl = document.getElementById('editor-name');
    const name = (nameEl && nameEl.value.trim()) || 'Мой уровень';
    const level = {
        name,
        maze: editorState.maze.map(row => row.slice()),
        start: { ...editorState.start },
        finish: { ...editorState.finish },
        placements
    };
    if (editorState.secretEntrance) level.secretEntrance = { ...editorState.secretEntrance };
    if (editorState.secretBossEntrance) level.secretBossEntrance = { ...editorState.secretBossEntrance };
    if (placements.some(p => p.type === 'boss')) level.bossLevel = true;
    return level;
}

/**
 * Валидация уровня: старт/финиш, проходимость, босс, трещина
 * @returns {string|null} сообщение об ошибке или null
 */
function validateEditorLevel() {
    const level = buildLevelFromEditor();
    const size = editorState.size;
    const maze = level.maze;

    if (!level.start || !level.finish) return 'Задайте старт и финиш.';
    if (!maze[level.start.y] || maze[level.start.y][level.start.x] !== 0) return 'Старт должен стоять на проходимой клетке.';
    if (!maze[level.finish.y] || maze[level.finish.y][level.finish.x] !== 0) return 'Финиш должен стоять на проходимой клетке.';
    if (level.start.y === level.finish.y && level.start.x === level.finish.x) return 'Старт и финиш не должны совпадать.';

    const boss = level.placements.find(p => p.type === 'boss');
    if (boss) {
        if (boss.y + 1 >= size || boss.x + 1 >= size) return 'Босс выходит за границы лабиринта.';
        for (const [dy, dx] of [[0,0],[0,1],[1,0],[1,1]]) {
            if (maze[boss.y + dy][boss.x + dx] === 1) return 'Босс должен стоять на проходимом блоке 2×2.';
        }
        const hasSword = level.placements.some(p => p.type === 'sword');
        if (!hasSword && !level.secretEntrance) return 'На босс-уровне нужен меч ⚔ или трещина 🗝 (чтобы победить босса).';
    }

    if (level.secretEntrance) {
        const se = level.secretEntrance;
        if (se.y <= 0 || se.y >= size - 1 || se.x <= 0 || se.x >= size - 1) return 'Трещина 🗝 должна быть на внутренней стене (не по краю).';
        if (maze[se.y][se.x] !== 1) return 'Трещина 🗝 должна быть на стене.';
    }

    if (level.secretBossEntrance) {
        const sbe = level.secretBossEntrance;
        if (sbe.y <= 0 || sbe.y >= size - 1 || sbe.x <= 0 || sbe.x >= size - 1) return 'Трещина 💗 секретного босса должна быть на внутренней стене (не по краю).';
        if (maze[sbe.y][sbe.x] !== 1) return 'Трещина 💗 секретного босса должна быть на стене.';
        if (level.secretEntrance && level.secretEntrance.y === sbe.y && level.secretEntrance.x === sbe.x) return 'Трещины 🗝 и 💗 не должны совпадать.';
        const reachable = Array.from({ length: size }, () => Array(size).fill(false));
        const q = [{ y: level.start.y, x: level.start.x }];
        reachable[level.start.y][level.start.x] = true;
        let near = false;
        while (q.length > 0 && !near) {
            const cur = q.shift();
            for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const ny = cur.y + dy;
                const nx = cur.x + dx;
                if (ny < 0 || ny >= size || nx < 0 || nx >= size) continue;
                if (Math.abs(ny - sbe.y) + Math.abs(nx - sbe.x) === 1) near = true;
                if (maze[ny][nx] !== 0 || reachable[ny][nx]) continue;
                reachable[ny][nx] = true;
                q.push({ y: ny, x: nx });
            }
        }
        if (!near) return 'Трещина 💗 секретного босса должна быть достижима со стороны прохода.';
    }

    if (level.placements.some(p => p.type === 'secretBoss')) {
        const hasSword = level.placements.some(p => p.type === 'sword');
        if (!hasSword && !level.secretEntrance) return 'С сердечками 💗 нужен меч ⚔ или трещина 🗝 (чтобы победить босса).';
    }

    const path = PathFinder.findPath(level.start, level.finish, maze, size, size);
    if (!path) return 'Нет пути от старта до финиша!';

    return null;
}

/**
 * Запуск превью уровня
 */
function editorTest() {
    const err = validateEditorLevel();
    if (err) { setEditorMessage('❌ ' + err); return; }
    showScreen('game-screen');
    initPreviewLevel(buildLevelFromEditor());
}

/**
 * Сохранение уровня в список пользовательских
 */
function editorSave() {
    const err = validateEditorLevel();
    if (err) { setEditorMessage('❌ ' + err); return; }
    addCustomLevel(buildLevelFromEditor());
    setEditorMessage('✅ Уровень сохранён! Он в списке уровней.');
}

/**
 * Экспорт уровня в JSON
 */
function editorExport() {
    const json = exportLevel(buildLevelFromEditor());
    const ta = document.getElementById('editor-import');
    if (ta) ta.value = json;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(
                () => setEditorMessage('✅ JSON скопирован в буфер обмена'),
                () => {}
            );
        }
    } catch (e) { /* буфер может быть недоступен */ }
    if (!(navigator.clipboard && navigator.clipboard.writeText)) {
        setEditorMessage('✅ Экспорт: JSON в поле ниже.');
    }
}

/**
 * Импорт уровня из JSON-поля
 */
function editorImport() {
    const ta = document.getElementById('editor-import');
    if (!ta) return;
    const level = importLevel(ta.value);
    if (!level) { setEditorMessage('❌ Неверный JSON уровня.'); return; }
    loadLevelIntoEditor(level);
    setEditorMessage('✅ Уровень импортирован.');
}

/**
 * Загрузка уровня в редактор
 */
function loadLevelIntoEditor(level) {
    editorState.size = level.maze.length;
    const sizeEl = document.getElementById('editor-size');
    if (sizeEl) sizeEl.value = String(editorState.size);
    editorState.maze = level.maze.map(row => row.slice());
    editorState.start = { y: level.start.y, x: level.start.x };
    editorState.finish = { y: level.finish.y, x: level.finish.x };
    editorState.placements = (level.placements || []).map(p => ({ type: p.type, y: p.y, x: p.x }));
    editorState.secretEntrance = level.secretEntrance
        ? { y: level.secretEntrance.y, x: level.secretEntrance.x }
        : null;
    editorState.secretBossEntrance = level.secretBossEntrance
        ? { y: level.secretBossEntrance.y, x: level.secretBossEntrance.x }
        : null;
    editorState.previewArena = false;
    const nameEl = document.getElementById('editor-name');
    if (nameEl) nameEl.value = level.name || 'Мой уровень';
    drawEditor();
}

/**
 * Сообщение в редакторе
 */
function setEditorMessage(msg) {
    const el = document.getElementById('editor-message');
    if (el) el.textContent = msg;
}
