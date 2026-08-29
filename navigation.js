// ==================== НАВИГАЦИЯ ====================

/**
 * Экранирование HTML-символов (имена уровней вставляются в разметку)
 * @param {string} str - строка
 * @returns {string} экранированная строка
 */
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/**
 * Показать определенный экран
 * @param {string} id - ID экрана для отображения
 */
function showScreen(id) {
    ['menu-screen','password-screen','level-select-screen','difficulty-screen','tutorial-screen','admin-screen','editor-screen','game-screen','end-screen','achievements-screen','lang-screen'].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    if (id === 'level-select-screen') renderLevelButtons();
    if (id === 'achievements-screen') renderAchievementsScreen();

    // Музыка меню: играет на любом экране меню, останавливается при запуске игры
    if (id === 'game-screen') {
        stopMenuMusic();
    } else {
        playMenuMusic();
    }
}

// Аудио-трек главного меню
let menuAudio = null;

/**
 * Включить музыку меню (зацикленно)
 */
function playMenuMusic() {
    try {
        if (menuAudio && !menuAudio.paused) return;
        if (!menuAudio) {
            menuAudio = new Audio('audio/Toby_Fox_-_WELCOME_TO_THE_CITY_(SkySound7.com).mp3');
            menuAudio.loop = true;
            menuAudio.volume = 0.3;
        }
        const p = menuAudio.play();
        if (p && p.catch) p.catch(() => {});
    } catch (e) { /* аудио не должно ломать меню */ }
}

/**
 * Остановить музыку меню
 */
function stopMenuMusic() {
    try {
        if (menuAudio) {
            menuAudio.pause();
            menuAudio.currentTime = 0;
        }
    } catch (e) { /* аудио не должно ломать меню */ }
}

/**
 * Случайный индекс открытого основного уровня (обучающий уровень исключён)
 * @returns {number}
 */
function randomMainLevelIndex() {
    const max = Math.min(getMaxUnlocked(), getTotalLevels() - 1);
    if (max < 1) return 1;
    return 1 + Math.floor(Math.random() * max);
}

/**
 * Начать игру: продолжить с первого непройденного уровня
 * (или заново с обучения, если всё пройдено)
 */
function startGame() {
    const max = getMaxUnlocked();
    selectedLevel = max >= getTotalLevels() ? 0 : max;
    showScreen('game-screen');
    initGame();
}

/**
 * Показать экран выбора уровня
 */
function showLevelSelect() {
    showScreen('level-select-screen');
}

/**
 * Показать экран выбора сложности
 */
function showDifficulty() {
    showScreen('difficulty-screen');
}

/**
 * Показать экран обучения
 */
function showTutorial() {
    const back = document.getElementById('tutorial-back-btn');
    if (back) back.style.display = '';
    showScreen('tutorial-screen');
}

// Флаг прохождения обязательного обучения
const TUTORIAL_FLAG = 'miron_tutorial_done';

/**
 * Пройдено ли обязательное обучение
 * @returns {boolean}
 */
function isTutorialDone() {
    return localStorage.getItem(TUTORIAL_FLAG) === '1';
}

// Прогресс прохождения: последний открытый уровень (индекс в общем списке)
const UNLOCK_KEY = 'miron_unlocked';

/**
 * Последний открытый уровень (по умолчанию 0 — обучение)
 * @returns {number}
 */
function getMaxUnlocked() {
    const v = parseInt(localStorage.getItem(UNLOCK_KEY), 10);
    return isNaN(v) ? 0 : v;
}

/**
 * Открыть уровень (только вперёд)
 * @param {number} i - индекс уровня
 */
function setMaxUnlocked(i) {
    if (i > getMaxUnlocked()) localStorage.setItem(UNLOCK_KEY, String(i));
}

/**
 * Открыт ли уровень i (последовательное прохождение)
 * @param {number} i - индекс уровня
 * @returns {boolean}
 */
function isLevelUnlocked(i) {
    return i <= getMaxUnlocked();
}

/**
 * Завершить обучение и сразу начать обучающий уровень
 */
function finishTutorial() {
    localStorage.setItem(TUTORIAL_FLAG, '1');
    selectedLevel = 0;
    showScreen('game-screen');
    initGame();
}

/**
 * При первом запуске показать обязательное обучение вместо меню
 */
function initTutorialGate() {
    if (isTutorialDone()) return;
    const back = document.getElementById('tutorial-back-btn');
    if (back) back.style.display = 'none';
    showScreen('tutorial-screen');
}

/**
 * Показать админ-панель (с запросом пароля)
 */
function showAdmin() {
    requestProtectedScreen('admin-screen');
}

/**
 * Показать редактор уровней (с запросом пароля)
 */
function showEditor() {
    requestProtectedScreen('editor-screen');
}

function showAchievements() {
    showScreen('achievements-screen');
}

function showLangScreen() {
    showScreen('lang-screen');
}

function resetProgress() {
    if (!confirm(t('nav_reset_confirm'))) return;
    localStorage.removeItem('miron_wallet');
    localStorage.removeItem('miron_inventory');
    localStorage.removeItem('miron_achievements');
    localStorage.removeItem('miron_unlocked');
    localStorage.removeItem('miron_tutorial_done');
    location.reload();
}

// Пароль доступа к админ-панели и редактору
const ADMIN_PASSWORD = '31415lol';

// Экран, который нужно открыть после успешного ввода пароля
let pendingProtectedScreen = null;

/**
 * Запросить пароль перед открытием защищённого экрана
 * @param {string} target - ID целевого экрана
 */
function requestProtectedScreen(target) {
    pendingProtectedScreen = target;
    const input = document.getElementById('password-input');
    const msg = document.getElementById('password-message');
    if (input) input.value = '';
    if (msg) msg.textContent = '';
    showScreen('password-screen');
}

/**
 * Проверить введённый пароль и открыть защищённый экран
 */
function submitPassword() {
    const input = document.getElementById('password-input');
    const msg = document.getElementById('password-message');
    const value = input ? input.value : '';
    if (value === ADMIN_PASSWORD) {
        const target = pendingProtectedScreen || 'menu-screen';
        pendingProtectedScreen = null;
        showScreen(target);
        if (target === 'editor-screen' && typeof initEditorUI === 'function') initEditorUI();
    } else {
        if (msg) msg.textContent = t('password_wrong');
        if (input) { input.value = ''; input.focus(); }
    }
}

/**
 * Отменить ввод пароля и вернуться в меню
 */
function cancelPassword() {
    pendingProtectedScreen = null;
    showScreen('menu-screen');
}

/**
 * Вернуться в главное меню
 */
function backToMenu() {
    if (typeof stopLevelMusic === 'function') stopLevelMusic();
    showScreen('menu-screen');
}

/**
 * Вернуться в меню из игры
 */
function backToMenuFromGame() {
    if (currentGame) {
        currentGame.gameRunning = false;
        currentGame.stopBossMusic();
        currentGame.stopShopMusic();
        currentGame.stopSecretMusic();
        currentGame.stopSecretBossMusic();
        currentGame = null;
    }
    if (typeof stopLevelMusic === 'function') stopLevelMusic();
    showScreen('menu-screen');
}

/**
 * Отобразить кнопки выбора уровня (встроенные + пользовательские)
 */
function renderLevelButtons() {
    const container = document.getElementById('levelButtons');
    const max = getMaxUnlocked();
    let html = LEVELS.map((l, i) => {
        if (i > max) {
            return `<div class="level-num locked" title="${t('level_locked_title')}">🔒</div>`;
        }
        return `
        <div class="level-num${l.tutorial ? ' tutorial' : ''}" onclick="selectLevel(${i})" title="${escapeHtml(getLevelName(l, i))}">${l.tutorial ? '1' : (i + 1)}</div>
    `;
    }).join('');

    // Пользовательские уровни из редактора
    CUSTOM_LEVELS.forEach((l, j) => {
        const idx = LEVELS.length + j;
        const locked = idx > max;
        const inner = locked
            ? `<span class="custom-label">🔒</span>
               <span class="custom-del" onclick="event.stopPropagation(); removeCustomLevelAt(${j}); renderLevelButtons();">🗑</span>`
            : `<span class="custom-label">${escapeHtml(l.name)}</span>
               <span class="custom-del" onclick="event.stopPropagation(); removeCustomLevelAt(${j}); renderLevelButtons();">🗑</span>`;
        html += `
        <div class="level-num custom${locked ? ' locked' : ''}" onclick="${locked ? '' : 'selectLevel(' + idx + ')'}" title="${escapeHtml(l.name)}">
            ${inner}
        </div>`;
    });

    container.innerHTML = html;
}

// Текущий выбранный уровень
let selectedLevel = 0;

/**
 * Выбрать конкретный уровень
 * @param {number} i - индекс уровня
 */
function selectLevel(i) {
    if (!isLevelUnlocked(i)) return;
    selectedLevel = i;
    showScreen('game-screen');
    initGame();
}

// Текущая сложность
let difficulty = 'medium';

/**
 * Установить сложность игры
 * @param {string} d - уровень сложности ('easy', 'medium', 'hard')
 */
function setDifficulty(d) {
    difficulty = d;
    try { localStorage.setItem('miron_difficulty', d); } catch (e) {}
    document.querySelectorAll('#difficulty-screen .menu-btn').forEach(b => b.style.outline = 'none');
    const map = { easy: 0, medium: 1, hard: 2 };
    document.querySelectorAll('#difficulty-screen .menu-btn')[map[d]].style.outline = '2px solid #fff';
    setTimeout(backToMenu, 400);
}

// Настройки администратора
let adminSettings = {
    enemyCount: 3,
    patrolCount: 2,
    agroLimit: 3,
    visionRange: 99,
    finishLock: 'yes',
    invincible: 'no',
    keys: 'yes',
    fog: 'no',
    fogVision: 4
};

/**
 * Применить настройки из админ-панели
 */
function applyAdmin() {
    adminSettings = {
        enemyCount: +document.getElementById('aEnemyCount').value,
        patrolCount: +document.getElementById('aPatrolCount').value,
        agroLimit: +document.getElementById('aAgro').value,
        visionRange: +document.getElementById('aVision').value,
        finishLock: document.getElementById('aFinishLock').value,
        invincible: document.getElementById('aInvincible').value,
        keys: document.getElementById('aKeys').value,
        fog: document.getElementById('aFog').value,
        fogVision: +document.getElementById('aFogVision').value
    };

    // Проверяем, чтобы количество стражей не превышало общее количество врагов
    if (adminSettings.patrolCount > adminSettings.enemyCount) {
        adminSettings.patrolCount = adminSettings.enemyCount;
        document.getElementById('aPatrolCount').value = adminSettings.enemyCount;
        document.getElementById('aPatrolCountVal').textContent = adminSettings.enemyCount;
    }

    const btn = document.querySelector('#admin-screen .apply-btn');
    btn.textContent = t('admin_applied');
    btn.style.background = '#4f4';
    setTimeout(() => {
        btn.textContent = t('admin_apply');
        btn.style.background = '#a6f';
    }, 1000);

    updateEnemyDistribution();
}

/**
 * Обновить отображение распределения врагов
 */
function updateEnemyDistribution() {
    const total = +document.getElementById('aEnemyCount').value;
    const patrol = +document.getElementById('aPatrolCount').value;

    // Ограничиваем количество стражей
    if (patrol > total) {
        document.getElementById('aPatrolCount').value = total;
        document.getElementById('aPatrolCountVal').textContent = total;
    }

    const actualPatrol = Math.min(patrol, total);
    const normal = total - actualPatrol;

    document.getElementById('aNormalCount').textContent = normal;
    document.getElementById('aPatrolCountDisplay').textContent = actualPatrol;
}

/**
 * Получить текущие настройки игры
 * @returns {Object} объект с настройками
 */
function getSettings() {
    const def = {
        enemyCount: 3,
        patrolCount: 2,
        agroLimit: 3,
        visionRange: 99,
        finishLock: 'yes',
        invincible: 'no',
        keys: 'yes',
        fog: 'no',
        fogVision: 4,
        difficulty,
        fromAdmin: false
    };

    // Проверяем, были ли изменены настройки в админ-панели
    // (fromAdmin и difficulty исключаем из сравнения — их нет в adminSettings)
    const changed = Object.keys(def).some(k => k !== 'fromAdmin' && k !== 'difficulty' && adminSettings[k] !== def[k]);

    if (changed) {
        return { ...adminSettings, difficulty, fromAdmin: true };
    }

    // Возвращаем настройки в зависимости от сложности
    switch(difficulty) {
        case 'easy':
            return { ...def, enemyCount: 2, patrolCount: 1, agroLimit: 4, keys: 'no', startHp: 3, fromAdmin: false };
        case 'medium':
            return { ...def, enemyCount: 3, patrolCount: 2, agroLimit: 3, keys: 'yes', fog: 'no', startHp: 2, fromAdmin: false };
        case 'hard':
            return { ...def, enemyCount: 4, patrolCount: 2, agroLimit: 2, keys: 'yes', fog: 'yes', startHp: 1, fromAdmin: false };
        default:
            return { ...def, fromAdmin: false };
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Восстановить сложность из localStorage
    try {
        const saved = localStorage.getItem('miron_difficulty');
        if (saved && ['easy', 'medium', 'hard'].includes(saved)) difficulty = saved;
    } catch (e) {}
    updateEnemyDistribution();
    playMenuMusic();
    // Применить перевод при загрузке
    if (typeof applyUITranslations === 'function') applyUITranslations();
    // Обновить легенду игры
    const legendEl = document.getElementById('game-legend');
    if (legendEl) legendEl.innerHTML = t('game_legend', '<span id="levelNumDisplay"></span>');
});