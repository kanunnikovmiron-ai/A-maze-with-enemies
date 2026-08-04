/**
 * Реестр типов размещения для редактора уровней.
 * Палитра редактора строится из этого реестра.
 */
const PLACEMENT_TYPES = {
    wall: {
        label: 'Стена',
        icon: '🧱',
        color: '#5d6a7a',
        tool: true
    },
    erase: {
        label: 'Стереть',
        icon: '🧹',
        color: '#333',
        tool: true
    },
    start: {
        label: 'Старт',
        icon: 'S',
        color: '#4f4',
        tool: true,
        single: true
    },
    finish: {
        label: 'Финиш',
        icon: 'F',
        color: '#4a4',
        tool: true,
        single: true
    },
    enemy: {
        label: 'Враг',
        icon: '👾',
        color: '#f22'
    },
    patrol: {
        label: 'Страж',
        icon: '🔺',
        color: '#a6f'
    },
    boss: {
        label: 'Босс 2×2',
        icon: '👹',
        color: '#a33',
        single: true,
        block: true
    },
    key: {
        label: 'Ключ',
        icon: '🔑',
        color: '#fa0'
    },
    sword: {
        label: 'Меч',
        icon: '⚔',
        color: '#ff0',
        single: true
    },
    buffHp: {
        label: '+1 HP',
        icon: '❤',
        color: '#f55'
    },
    buffInv: {
        label: 'Щит',
        icon: '🛡',
        color: '#5ff'
    },
    secret: {
        label: 'Трещина',
        icon: '🗝',
        color: '#fe0',
        single: true,
        wallOnly: true
    },
    secretBoss: {
        label: 'Секретный босс',
        icon: '💗',
        color: '#f4f'
    },
    secretBossArena: {
        label: 'Арена секр. босса',
        icon: '💥',
        color: '#f4f',
        single: true,
        wallOnly: true
    }
};

// Порядок отображения в палитре редактора
const PLACEMENT_ORDER = [
    'wall', 'erase', 'start', 'finish',
    'enemy', 'patrol', 'boss', 'key',
    'sword', 'buffHp', 'buffInv', 'secret', 'secretBossArena', 'secretBoss'
];
