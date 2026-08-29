/**
 * Пользовательские уровни из редактора.
 * Хранятся в localStorage, добавляются в общий список уровней после встроенных.
 */
const CUSTOM_LEVELS_KEY = 'miron_custom_levels';

let CUSTOM_LEVELS = [];

/**
 * Загрузка пользовательских уровней из localStorage
 */
function loadCustomLevels() {
    try {
        const raw = localStorage.getItem(CUSTOM_LEVELS_KEY);
        if (!raw) {
            CUSTOM_LEVELS = [];
            return;
        }
        const parsed = JSON.parse(raw);
        CUSTOM_LEVELS = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        CUSTOM_LEVELS = [];
    }
}

/**
 * Сохранение пользовательских уровней в localStorage
 */
function saveCustomLevels() {
    try {
        localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(CUSTOM_LEVELS));
    } catch (e) { /* localStorage может быть недоступен */ }
}

/**
 * Общее количество уровней (встроенные + пользовательские)
 * @returns {number}
 */
function getTotalLevels() {
    return LEVELS.length + CUSTOM_LEVELS.length;
}

/**
 * Получение уровня по общему индексу
 * @param {number} index - общий индекс (0 - первый встроенный)
 * @returns {Object} объект уровня
 */
function resolveLevel(index) {
    if (index < LEVELS.length) return LEVELS[index];
    return CUSTOM_LEVELS[index - LEVELS.length];
}

/**
 * Добавить пользовательский уровень.
 * В редакторе только один пользовательский уровень — повторное сохранение перезаписывает его.
 * @param {Object} level - объект уровня (maze, start, finish, placements...)
 */
function addCustomLevel(level) {
    CUSTOM_LEVELS.push(level);
    saveCustomLevels();
}

/**
 * Удалить пользовательский уровень
 * @param {number} i - индекс среди пользовательских уровней
 */
function removeCustomLevelAt(i) {
    CUSTOM_LEVELS.splice(i, 1);
    saveCustomLevels();
}

function clearCustomLevels() {
    CUSTOM_LEVELS = [];
    saveCustomLevels();
}

/**
 * Экспорт уровня в JSON-строку
 * @param {Object} level - объект уровня
 * @returns {string}
 */
function exportLevel(level) {
    return JSON.stringify(level);
}

/**
 * Импорт уровня из JSON-строки
 * @param {string} json - JSON-строка уровня
 * @returns {Object|null} объект уровня или null при ошибке
 */
function importLevel(json) {
    try {
        const level = JSON.parse(json);
        if (!level || !Array.isArray(level.maze) || !level.maze.length) return null;
        if (!level.start || !level.finish) return null;
        if (typeof level.start.y !== 'number' || typeof level.start.x !== 'number') return null;
        if (typeof level.finish.y !== 'number' || typeof level.finish.x !== 'number') return null;
        return level;
    } catch (e) {
        return null;
    }
}

loadCustomLevels();
