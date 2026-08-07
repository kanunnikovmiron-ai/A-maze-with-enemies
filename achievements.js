/**
 * Модуль достижений (ачивок)
 * Хранение: localStorage 'miron_achievements'
 */
const ACHIEVEMENTS_KEY = 'miron_achievements';

const ACHIEVEMENTS = [
    { id: 'first_blood', icon: '\u2694\uFE0F', title: 'Первая кровь', desc: 'Убить первого врага мечом' },
    { id: 'slayer_10', icon: '\uD83D\uDDE1\uFE0F', title: 'Охотник', desc: 'Убить 10 врагов' },
    { id: 'slayer_50', icon: '\uD83D\uDC80', title: 'Истребитель', desc: 'Убить 50 врагов' },
    { id: 'slayer_100', icon: '\uD83D\uDC51', title: 'Легенда мечей', desc: 'Убить 100 врагов' },
    { id: 'archer', icon: '\uD83C\uDFF9', title: 'Лучник', desc: 'Выпустить первый выстрел из лука' },
    { id: 'bow_master', icon: '\uD83C\uDFAF', title: 'Мастер лука', desc: 'Убить 10 врагов стрелой' },
    { id: 'first_boss', icon: '\uD83D\uDC09', title: 'Павший титан', desc: 'Повержен первый босс' },
    { id: 'all_bosses', icon: '\uD83D\uDC78', title: 'Бог убийц', desc: 'Повержены все 3 босса' },
    { id: 'secret_killer', icon: '\uD83D\uDC97', title: 'Охотник за сердцем', desc: 'Повержен секретный босс' },
    { id: 'secret_hunter', icon: '\uD83D\uDDDD\uFE0F', title: 'Охотник за тайнами', desc: 'Найти секретную комнату' },
    { id: 'shopaholic', icon: '\uD83D\uDED2', title: 'Шопоголик', desc: 'Купить что-то в магазине' },
    { id: 'collector', icon: '\uD83D\uDCB0', title: 'Коллекционер', desc: 'Купить всё в магазине' },
    { id: 'rich', icon: '\uD83D\uDC8E', title: 'Богач', desc: 'Накопить 200 монет' },
    { id: 'mega_rich', icon: '\uD83C\uDFE6', title: 'Магнат', desc: 'Накопить 500 монет' },
    { id: 'level_1', icon: '\uD83C\uDF31', title: 'Новичок', desc: 'Пройти первый уровень' },
    { id: 'level_5', icon: '\uD83D\uDDFA\uFE0F', title: 'Путешественник', desc: 'Пройти 5 карт' },
    { id: 'all_levels', icon: '\uD83C\uDFC6', title: 'Завоеватель', desc: 'Пройти все 12 карт' },
    { id: 'no_damage', icon: '\uD83D\uDCAA', title: 'Безупречно', desc: 'Пройти уровень без потери HP' },
    { id: 'speedrunner', icon: '\u26A1', title: 'Молниеносный', desc: 'Пройти уровень за < 50 ходов' },
    { id: 'tutorial_done', icon: '\uD83C\uDF93', title: 'Выпускник', desc: 'Пройти обучение' },
    { id: 'coin_1000', icon: '\uD83E\uDE99', title: 'Сокровищница', desc: 'Заработать 1000 монет за всё время' },
    { id: 'sword_plus', icon: '\uD83D\uDD25', title: 'Огненный меч', desc: 'Купить улучшенный меч' },
    { id: 'boss_sword', icon: '\u2694\uFE0F', title: 'Мечник', desc: 'Убить босса мечом' },
    { id: 'boss_arrow', icon: '\uD83C\uDFF9', title: 'Стрелок', desc: 'Убить босса стрелой' },
    { id: 'full_hp', icon: '\uD83D\uDEE1\uFE0F', title: 'Танк', desc: 'Пройти уровень с полным HP' }
];

function getTranslatedAchievement(ach) {
    return {
        id: ach.id,
        icon: ach.icon,
        title: t('ach_' + ach.id + '_title'),
        desc: t('ach_' + ach.id + '_desc'),
        unlocked: false
    };
}

function getAchievements() {
    try { var raw = localStorage.getItem(ACHIEVEMENTS_KEY); if (raw) return JSON.parse(raw); } catch(e) {}
    return { unlocked: {}, stats: {} };
}
function saveAchievements(data) { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data)); }
function getStats() { return getAchievements().stats; }
function updateStat(key, delta) { var d = getAchievements(); if (!d.stats) d.stats = {}; d.stats[key] = (d.stats[key]||0) + (delta||1); saveAchievements(d); }
function setStat(key, value) { var d = getAchievements(); if (!d.stats) d.stats = {}; d.stats[key] = value; saveAchievements(d); }
function isUnlocked(id) { return !!getAchievements().unlocked[id]; }
function unlockAchievement(id) { var d = getAchievements(); if (d.unlocked[id]) return false; d.unlocked[id] = true; saveAchievements(d); showAchievementToast(id); return true; }
function getUnlockedCount() { return Object.keys(getAchievements().unlocked).length; }
function getTotalCount() { return ACHIEVEMENTS.length; }
function getAchievement(id) { return ACHIEVEMENTS.find(function(a){return a.id===id;}); }
function getAllAchievements() { var d = getAchievements(); return ACHIEVEMENTS.map(function(a){ var tr = getTranslatedAchievement(a); tr.unlocked = !!d.unlocked[a.id]; return tr; }); }
function showAchievementToast(id) {
    var ach = getAchievement(id); if (!ach) return;
    var toast = document.getElementById('achievement-toast'); if (!toast) return;
    toast.innerHTML = '<span class="toast-icon">' + ach.icon + '</span> <span class="toast-text">' + t('ach_' + ach.id + '_title') + '</span>';
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function(){ toast.classList.remove('show'); }, 3000);
}
function checkAchievements() {
    var s = getStats();
    if ((s.levelsCompleted||0) >= 1) unlockAchievement('level_1');
    if ((s.levelsCompleted||0) >= 5) unlockAchievement('level_5');
    if ((s.levelsCompleted||0) >= 12) unlockAchievement('all_levels');
    if ((s.totalKills||0) >= 1) unlockAchievement('first_blood');
    if ((s.totalKills||0) >= 10) unlockAchievement('slayer_10');
    if ((s.totalKills||0) >= 50) unlockAchievement('slayer_50');
    if ((s.totalKills||0) >= 100) unlockAchievement('slayer_100');
    if ((s.bowShots||0) >= 1) unlockAchievement('archer');
    if ((s.arrowKills||0) >= 10) unlockAchievement('bow_master');
    if ((s.bossesDefeated||0) >= 1) unlockAchievement('first_boss');
    if ((s.bossesDefeated||0) >= 3) unlockAchievement('all_bosses');
    if ((s.secretBossDefeated||0) >= 1) unlockAchievement('secret_killer');
    if ((s.secretRoomsFound||0) >= 1) unlockAchievement('secret_hunter');
    if ((s.shopBuys||0) >= 1) unlockAchievement('shopaholic');
    // Коллекционер — все 4 типа товаров куплены (меч, меч+, лук, +HP)
    const inv = getInventory();
    const uniqueTypes = [inv.sword, inv.swordPlus, inv.bow, (inv.hpBonus||0) > 0].filter(Boolean).length;
    if (uniqueTypes >= 4) unlockAchievement('collector');
    if ((s.coinsEver||0) >= 200) unlockAchievement('rich');
    if ((s.coinsEver||0) >= 500) unlockAchievement('mega_rich');
    if ((s.coinsEver||0) >= 1000) unlockAchievement('coin_1000');
}
function checkLevelAchievements(levelStats) {
    if (levelStats.noDamage) unlockAchievement('no_damage');
    if (levelStats.fullHp) unlockAchievement('full_hp');
    if (levelStats.moves < 50) unlockAchievement('speedrunner');
    if (levelStats.levelIndex === 0) unlockAchievement('tutorial_done');
}
function resetAchievements() { localStorage.removeItem(ACHIEVEMENTS_KEY); }
function renderAchievementsScreen() {
    var container = document.getElementById('achievements-grid'); if (!container) return;
    var all = getAllAchievements(), unlocked = getUnlockedCount(), total = getTotalCount();
    container.innerHTML = '';
    var header = document.createElement('div'); header.className = 'ach-header';
    header.innerHTML = '\uD83C\uDFC6 ' + unlocked + ' / ' + total;
    container.appendChild(header);
    var grid = document.createElement('div'); grid.className = 'ach-grid';
    for (var i = 0; i < all.length; i++) {
        var ach = all[i];
        var card = document.createElement('div');
        card.className = 'ach-card' + (ach.unlocked ? ' unlocked' : ' locked');
        card.innerHTML = '<div class="ach-icon">' + (ach.unlocked ? ach.icon : '\uD83D\uDD12') + '</div>'
            + '<div class="ach-title">' + (ach.unlocked ? ach.title : t('ach_locked')) + '</div>'
            + '<div class="ach-desc">' + ach.desc + '</div>';
        grid.appendChild(card);
    }
    container.appendChild(grid);
}