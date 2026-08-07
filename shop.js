// ==================== МАГАЗИН И МОНЕТЫ ====================

// Ключи localStorage
const WALLET_KEY = 'miron_wallet';
const INVENTORY_KEY = 'miron_inventory';

// Награды за действия
const COIN_REWARDS = {
    enemy: 3,        // Обычный враг
    patrol: 5,       // Страж
    boss: 30,        // Босс
    levelClear: 10,  // Прохождение уровня
    secretBoss: 30   // Секретный босс (розовое сердце)
};

// Товары магазина (ключи совпадают с инвентарём)
const SHOP_ITEMS = [
    {
        id: 'sword',
        icon: '⚔',
        name: 'Меч',
        price: 50,
        desc: 'Начинайте каждый уровень с мечом (взмах — Пробел)',
        requires: null,
        maxCount: 1,
        boolean: true
    },
    {
        id: 'hpBonus',
        icon: '❤',
        name: '+1 макс. HP',
        price: 30,
        desc: 'Максимум здоровья +1 (всего до +3)',
        requires: null,
        maxCount: 3,
        boolean: false
    },
    {
        id: 'swordPlus',
        icon: '⚔⚔',
        name: 'Улучшенный меч',
        price: 100,
        desc: 'Урон боссу 2 за взмах (требует меч)',
        requires: 'sword',
        maxCount: 1,
        boolean: true
    },
    {
        id: 'bow',
        icon: '🏹',
        name: 'Лук',
        price: 75,
        desc: 'Дальнее оружие (E — стрельба, бесконечные стрелы)',
        requires: null,
        maxCount: 1,
        boolean: true
    }
];

function getShopItemName(id) {
    return t('shop_' + id + '_name');
}
function getShopItemDesc(id) {
    return t('shop_' + id + '_desc');
}

/**
 * Текущее количество монет
 * @returns {number}
 */
function getWallet() {
    const raw = localStorage.getItem(WALLET_KEY);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Установить количество монет
 * @param {number} n
 */
function setWallet(n) {
    const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    localStorage.setItem(WALLET_KEY, String(v));
}

/**
 * Добавить монеты
 * @param {number} n
 * @returns {number} новый баланс
 */
function addCoins(n) {
    if (!Number.isFinite(n) || n <= 0) return getWallet();
    const total = getWallet() + Math.floor(n);
    setWallet(total);
    return total;
}

/**
 * Инвентарь игрока (купленные бонусы)
 * @returns {Object} {sword, hpBonus, swordPlus}
 */
function getInventory() {
    let inv = null;
    try {
        inv = JSON.parse(localStorage.getItem(INVENTORY_KEY));
    } catch (e) { inv = null; }
    if (!inv || typeof inv !== 'object') inv = {};
    return {
        sword: !!inv.sword,
        hpBonus: Math.max(0, Math.min(3, Number(inv.hpBonus) || 0)),
        swordPlus: !!inv.swordPlus,
        bow: !!inv.bow
    };
}

/**
 * Сохранить инвентарь
 */
function saveInventory(inv) {
    const normalized = {
        ...inv,
        sword: !!inv.sword,
        hpBonus: Math.max(0, Math.min(3, Number(inv.hpBonus) || 0)),
        swordPlus: !!inv.swordPlus,
        bow: !!inv.bow
    };
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(normalized));
}

/**
 * Бонусы магазина для применения в игре
 * @returns {Object} {sword, hpBonus, swordPlus}
 */
function getShopBonuses() {
    const inv = getInventory();
    return {
        sword: inv.sword,
        hpBonus: inv.hpBonus,
        swordPlus: inv.swordPlus,
        bow: inv.bow
    };
}

/**
 * Можно ли купить товар
 * @param {string} id
 * @returns {Object} {ok, reason}
 */
function canBuy(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return { ok: false, reason: t('shop_err_not_found') };
    const inv = getInventory();

    const count = inv[id] || 0;
    if (count >= item.maxCount) return { ok: false, reason: t('shop_err_bought') };
    if (getWallet() < item.price) return { ok: false, reason: t('shop_err_no_coins') };
    if (item.requires && !inv[item.requires]) return { ok: false, reason: t('shop_err_need_sword') };
    return { ok: true, reason: '' };
}

/**
 * Купить товар (без UI, только логика)
 * @param {string} id
 * @returns {Object} {ok, reason, item}
 */
function buyItem(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    const check = canBuy(id);
    if (!item || !check.ok) {
        return { ok: false, reason: (check ? check.reason : t('shop_err_not_found')), item: null };
    }

    const inv = getInventory();
    if (item.boolean) {
        inv[id] = true;
    } else {
        inv[id] = (inv[id] || 0) + 1;
    }
    saveInventory(inv);
    setWallet(getWallet() - item.price);
    return { ok: true, reason: '', item: item };
}
