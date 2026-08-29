/**
 * Реестр типов размещения для редактора уровней.
 * Палитра редактора строится из этого реестра.
 */
const PLACEMENT_TYPES = {
    wall: {
        label: 'pt_wall',
        icon: '🧱',
        color: '#5d6a7a',
        tool: true
    },
    erase: {
        label: 'pt_erase',
        icon: '🧹',
        color: '#333',
        tool: true
    },
    start: {
        label: 'pt_start',
        icon: 'S',
        color: '#4f4',
        tool: true,
        single: true
    },
    finish: {
        label: 'pt_finish',
        icon: 'F',
        color: '#4a4',
        tool: true,
        single: true
    },
    enemy: {
        label: 'pt_enemy',
        icon: '👾',
        color: '#f22'
    },
    patrol: {
        label: 'pt_patrol',
        icon: '🔺',
        color: '#a6f'
    },
    boss: {
        label: 'pt_boss',
        icon: '👹',
        color: '#a33',
        single: true,
        block: true
    },
    key: {
        label: 'pt_key',
        icon: '🔑',
        color: '#fa0'
    },
    sword: {
        label: 'pt_sword',
        icon: '⚔',
        color: '#ff0',
        single: true
    },
    buffHp: {
        label: 'pt_buffHp',
        icon: '❤',
        color: '#f55'
    },
    buffInv: {
        label: 'pt_buffInv',
        icon: '🛡',
        color: '#5ff'
    },
    bow: {
        label: 'pt_bow',
        icon: '🏹',
        color: '#fa0',
        single: true
    },
    secret: {
        label: 'pt_secret',
        icon: '🗝',
        color: '#fe0',
        single: true,
        wallOnly: true
    },
    secretBoss: {
        label: 'pt_secretBoss',
        icon: '💗',
    color: '#8e44ad'
},
secretBossArena: {
    label: 'pt_secretBossArena',
    icon: '💥',
    color: '#8e44ad',
        single: true,
        wallOnly: true
    }
};

// Порядок отображения в палитре редактора
const PLACEMENT_ORDER = [
    'wall', 'erase', 'start', 'finish',
    'enemy', 'patrol', 'boss', 'key',
    'sword', 'buffHp', 'buffInv', 'bow', 'secret', 'secretBossArena', 'secretBoss'
];

function getPlacementLabel(type) {
    const def = PLACEMENT_TYPES[type];
    if (!def) return type;
    return (typeof t === 'function') ? t(def.label) : def.label;
}
