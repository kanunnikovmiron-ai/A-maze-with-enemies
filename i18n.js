// ==================== ИНТЕРНАЦИОНАЛИЗАЦИЯ (RU / EN) ====================

const I18N_KEY = 'miron_lang';

const I18N = {
    ru: {
        // === index.html ===
        html_title: 'Лабиринт — 12 карт',
        menu_title: '🏰 Лabyrinth with Enemies',
        btn_play: '🎮 Играть (продолжить с первого непройденного)',
        btn_levels: '🗺 Выбрать карту',
        btn_difficulty: '⚙️ Уровни сложности',
        btn_tutorial: '📖 Обучение',
        btn_admin: '🔧 Админ-панель',
        btn_editor: '🛠 Редактор карт',
        btn_achievements: '🏆 Достижения',
        btn_reset: '🗑 Сбросить всё',
        btn_lang: '🌐 Язык',

        // Password screen
        password_title: '🔒 Введите пароль',
        password_placeholder: 'Пароль',
        password_submit: 'Войти',
        password_back: '← Назад',
        password_wrong: '❌ Неверный пароль',

        // Level select
        level_select_title: '🗺 Выберите карту (1–11)',
        level_locked_title: '🔒 Пройдите предыдущие карты',

        // Difficulty
        difficulty_title: '⚙️ Выберите сложность',
        diff_easy: '🟢 Лёгкий',
        diff_easy_desc: '2 врага, агр 4',
        diff_medium: '🟡 Средний',
        diff_medium_desc: '3 врага, агр 3, 🔑 ключи',
        diff_hard: '🔴 Сложный',
        diff_hard_desc: '4 врага, агр 2, 🔑+🌫',

        // Tutorial
        tutorial_title: '📖 Как играть',
        tutorial_goal: '🎯 Цель: дойти до финиша F.',
        tutorial_controls: '🎮 Управление: Ц/Ф/Ы/В или WASD, или Стрелки',
        tutorial_maps: '🗺 12 карт: «0 · Обучение» для новичков + 11 сложных и проходимых!',
        tutorial_level0: '0️⃣ Уровень «Обучение»: соберите 🔑 ключи, найдите 🗝 трещину в стене, заберите ⚔ меч, победите 👾 врагов и дойдите до финиша.',
        tutorial_enemies: '👀 Враги: видят по прямой — бегут.',
        tutorial_keys: '🔑 Ключи: на среднем и сложном нужно собрать обе части, чтобы открыть финиш.',
        tutorial_fog: '🌫 Туман войны: на сложном карта скрыта, исследуйте её.',
        tutorial_finish: '🔒 Финиш: заблокирован при погоне.',
        tutorial_secret: '⚔ Секретная комната (10%): найдите трещину, возьмите меч и бейте врагов и босса клавишей Пробел. На «Обучении» трещина есть всегда.',
        tutorial_continue: 'Продолжить →',
        tutorial_back: '← Назад',

        // Admin panel
        admin_title: '🔧 Админ-панель',
        admin_normal_enemies: 'Обычные враги',
        admin_count: 'Кол-во:',
        admin_patrol: 'Стражи (треугольники)',
        admin_distribution: 'Распределение:',
        admin_normal: 'Обычных:',
        admin_patrol_label: 'Стражей:',
        admin_behavior: 'Настройки поведения',
        admin_agro: 'Агр (ходов):',
        admin_vision: 'Видимость:',
        admin_special: 'Особые режимы',
        admin_finish_lock: 'Блокировка финиша:',
        admin_invincible: 'Неуязвимость:',
        admin_keys: 'Ключи (2 части):',
        admin_fog: 'Туман войны:',
        admin_fog_radius: 'Радиус тумана:',
        admin_apply: '✅ Применить',
        admin_applied: '✅ Применено!',
        admin_yes: 'Да',
        admin_no: 'Нет',

        // Editor
        editor_title: '🛠 Редактор карт',
        editor_name: 'Название:',
        editor_name_default: 'Мой уровень',
        editor_size: 'Размер:',
        editor_test: '▶ Тест',
        editor_save: '💾 Сохранить',
        editor_export: '📋 Экспорт',
        editor_import_btn: '📥 Импорт',
        editor_preview: '💗 Превью арены',
        editor_new: '🆕 Новый',
        editor_menu: '↩ В меню',
        editor_import_placeholder: 'Сюда вставьте JSON карты для импорта',

        // Game screen
        game_title: '🏰 Лabyrinth',
        game_legend: 'Ц/Ф/Ы/В или WASD, или Стрелки | 🔒 закрыт | 🔓 открыт | 🔑 ключ | 🗝 стена-проход (10%) | ⚔ взмах — Пробел | 👹 босс: 6 ударов мечом, атаки огнём 🔥 | Уровень {0}/11',
        game_restart: '🔁 Заново',
        game_other_level: '🔄 Другой уровень',
        game_to_menu: '← В меню',

        // Achievements
        achievements_title: '🏆 Достижения',

        // End screen
        end_victory: '🏆 ПОБЕДА!',
        end_defeat: '💀 ПОРАЖЕНИЕ!',
        end_next: '➡ Следующий уровень',
        end_preview_done: 'Превью карты завершено!',
        end_all_done: 'Все карты пройдены!',
        end_next_msg: 'Отличная работа! Следующий уровень ждёт.',
        end_coins_note: ' (+{0} 🪙, баланс: {1} 🪙)',

        // === Game.js messages ===
        msg_status_spotted: '⚠️ Видят!',
        msg_status_searching: '🔍 Ищут.',
        msg_status_waiting: '⏳ Ждут ({0}/{1}).',
        msg_keys_collect: '🔑 Соберите части ключа ({0}/{1}).',
        msg_finish_locked: '🔒 Финиш заблокирован!',
        msg_finish_open: '🔓 Открыт!',

        // Tutorial hints
        tut_collect_keys: '🔑 Соберите обе части ключа ({0}/{1}). {2}',
        tut_find_crack: '🗝 Найдите трещину в стене — за ней ⚔ меч. {0}',
        tut_kill_enemies: '⚔ Бейте врагов Пробелом!',
        tut_go_finish: '🏁 Идите к финишу!',

        // Start message
        start_map: '🗺 Карта {0}: "{1}".',
        start_collect_keys: ' 🔑 Соберите {0} части ключа, чтобы открыть финиш.',
        start_finish_chase: ' 🔒 Финиш заблокирован при погоне.',
        start_fog: ' 🌫 Туман войны: исследуйте карту.',
        start_invincible: '🛡 Неуязвимость. ',
        start_tutorial_hint: ' 📖 Соберите 🔑 ключи, найдите 🗝 трещину в стене, возьмите ⚔ меч, победите врагов и дойдите до финиша.',

        // Arrow messages
        msg_boss_arrow_killed: '🏹 Босс повержен стрелой! Финиш открыт!',
        msg_boss_enraged: '🔥 Босс в ярости! Осталось ударов: {0}',
        msg_boss_arrow_hit: '🏹 Босс ранен! Осталось HP: {0}',
        msg_enemy_arrow_killed: '🏹 {0} убит стрелой!',

        // Shop
        msg_shop_enter: '🛒 Магазин! Подойдите к пьедесталу, чтобы купить.',
        msg_shop_exit: 'Выход из магазина.',
        msg_shop_bought: '✅ Куплено: {0} {1}! (баланс: {2} 🪙)',
        msg_shop_fail: '❌ {0}',

        shop_confirm_buy: 'Купить',
        shop_confirm_cancel: 'Отмена',
        shop_confirm_price: 'Цена: {0} 🪙',
        shop_confirm_coins: 'Ваш баланс: {0} 🪙',

        // Secret boss
        msg_secret_boss_defeated_first: '💖 Секретный босс повержен! (+30 монет)',
        msg_secret_boss_defeated: '💖 Секретный босс повержен!',
        msg_secret_boss_repelled: '💖 Босс отброшен! Осталось HP: {0}',
        msg_secret_boss_arena_enter: '💖 Секретный босс! Одолейте розовое сердце и получите 30 монет!',
        msg_secret_boss_arena_defeated: '💖 Секретный босс уже повежен. Выход — через трещину.',
        msg_secret_boss_arena_exit: 'Выход из арены секретного босса.',

        // Secret room
        msg_secret_room: '🗝 Секретная комната! Возьмите ⚔ меч или вернитесь через портал.',
        msg_got_sword: '⚔ Вы взяли меч! Теперь Пробел — взмах по врагам.',
        msg_secret_exit: 'Выход из секретной комнаты.',

        // === Player.js messages ===
        msg_heart_repelled: '🛡 Сердце отброшено.',
        msg_boss_repelled: '🛡 Босс отброшен.',
        msg_enemy_repelled: '🛡 Враг отброшен.',
        msg_key_found: '🔑 Часть ключа найдена ({0}/{1})!',
        msg_defeat_boss_first: '👹 Сначала победите босса!',
        msg_need_both_keys: '🔑 Нужны обе части ключа ({0}/{1})!',
        msg_finish_blocked: '🔒 Финиш заблокирован!',
        msg_got_sword_pickup: '⚔ Вы взяли меч! Теперь Пробел — взмах по врагам.',
        msg_hp_bonus: '❤ +1 HP! ({0}/{1})',
        msg_got_invincible: '🛡 Неуязвимость до конца карты!',
        msg_got_bow: '🏹 Вы взяли лук! Теперь E — стрельба.',
        msg_victory: '🏆 ПОБЕДА!',
        msg_no_sword: '⚔ У вас нет меча!',
        msg_swing_miss: '⚔ Взмах мимо!',
        msg_enemy_sword_killed: '⚔ {0} убит мечом!',
        msg_no_bow: '🏹 У вас нет лука!',
        msg_bow_reloading: '🏹 Перезарядка...',
        msg_bow_no_direction: '🏹 Сначала сдвиньтесь, чтобы выбрать направление!',
        msg_arrow_shot: '🏹 Стрела выпущена!',

        // Damage messages
        msg_defeat_heart: '💀 ПОРАЖЕНИЕ! Розовое сердце коснулось вас!',
        msg_defeat_bomb: '💀 ПОРАЖЕНИЕ! Бомба взорвалась!',
        msg_defeat_boss_touch: '💀 ПОРАЖЕНИЕ! Босс 👹 поймал вас!',
        msg_defeat_enemy_touch: '💀 ПОРАЖЕНИЕ! Вы наткнулись на {0}!',
        msg_defeat_fire: '💀 ПОРАЖЕНИЕ! Огонь босса настиг вас!',
        msg_hurt: '💔 Вы ранены! Осталось HP: {0}/{1}',

        // === Enemy messages ===
        msg_enemy_catch: '💀 ПОРАЖЕНИЕ! {0} поймал вас!',
        msg_enemy_repel: '🛡 Враг отброшен.',

        // Patrol messages
        msg_patrol_catch: '💀 ПОРАЖЕНИЕ! Страж {0} поймал вас!',
        msg_patrol_repel: '🛡 Страж отброшен.',

        // Boss messages
        msg_boss_defeated: '👹 Босс повержен! Финиш открыт!',
        msg_boss_enraged: '🔥 Босс в ярости! Осталось ударов: {0}',
        msg_boss_repelled_hp: '⚔ Босс отброшен! Осталось ударов: {0}',
        msg_boss_catch: '💀 ПОРАЖЕНИЕ! Босс 👹 поймал вас!',

        // === Renderer HUD ===
        hud_health: '❤ Здоровье: {0} ({1}/{2})',
        hud_coins: '🪙 {0}',
        hud_level_preview: '🏰 {0} (превью)',
        hud_level: '🏰 {0} ({1}/{2})',

        // === Shop items ===
        shop_sword_name: 'Меч',
        shop_sword_desc: 'Начинайте каждый уровень с мечом (взмах — Пробел)',
        shop_hp_name: '+1 макс. HP',
        shop_hp_desc: 'Максимум здоровья +1 (всего до +3)',
        shop_sword_plus_name: 'Улучшенный меч',
        shop_sword_plus_desc: 'Урон боссу 2 за взмах (требует меч)',
        shop_bow_name: 'Лук',
        shop_bow_desc: 'Дальнее оружие (E — стрельба, бесконечные стрелы)',
        shop_err_not_found: 'Товар не найден',
        shop_err_bought: 'Уже куплено',
        shop_err_no_coins: 'Не хватает монет',
        shop_err_need_sword: 'Требуется меч',

        // === Achievements ===
        ach_first_blood_title: 'Первая кровь',
        ach_first_blood_desc: 'Убить первого врага мечом',
        ach_slayer_10_title: 'Охотник',
        ach_slayer_10_desc: 'Убить 10 врагов',
        ach_slayer_50_title: 'Истребитель',
        ach_slayer_50_desc: 'Убить 50 врагов',
        ach_slayer_100_title: 'Легенда мечей',
        ach_slayer_100_desc: 'Убить 100 врагов',
        ach_archer_title: 'Лучник',
        ach_archer_desc: 'Выпустить первый выстрел из лука',
        ach_bow_master_title: 'Мастер лука',
        ach_bow_master_desc: 'Убить 10 врагов стрелой',
        ach_first_boss_title: 'Павший титан',
        ach_first_boss_desc: 'Повержен первый босс',
        ach_all_bosses_title: 'Бог убийц',
        ach_all_bosses_desc: 'Повержены все 3 босса',
        ach_secret_killer_title: 'Охотник за сердцем',
        ach_secret_killer_desc: 'Повержен секретный босс',
        ach_secret_hunter_title: 'Охотник за тайнами',
        ach_secret_hunter_desc: 'Найти секретную комнату',
        ach_shopaholic_title: 'Шопоголик',
        ach_shopaholic_desc: 'Купить что-то в магазине',
        ach_collector_title: 'Коллекционер',
        ach_collector_desc: 'Купить всё в магазине',
        ach_rich_title: 'Богач',
        ach_rich_desc: 'Накопить 200 монет',
        ach_mega_rich_title: 'Магнат',
        ach_mega_rich_desc: 'Накопить 500 монет',
        ach_level_1_title: 'Новичок',
        ach_level_1_desc: 'Пройти первый уровень',
        ach_level_5_title: 'Путешественник',
        ach_level_5_desc: 'Пройти 5 карт',
        ach_all_levels_title: 'Завоеватель',
        ach_all_levels_desc: 'Пройти все 12 карт',
        ach_no_damage_title: 'Безупречно',
        ach_no_damage_desc: 'Пройти уровень без потери HP',
        ach_speedrunner_title: 'Молниеносный',
        ach_speedrunner_desc: 'Пройти уровень за < 50 ходов',
        ach_tutorial_done_title: 'Выпускник',
        ach_tutorial_done_desc: 'Пройти обучение',
        ach_coin_1000_title: 'Сокровищница',
        ach_coin_1000_desc: 'Заработать 1000 монет за всё время',
        ach_sword_plus_title: 'Огненный меч',
        ach_sword_plus_desc: 'Купить улучшенный меч',
        ach_boss_sword_title: 'Мечник',
        ach_boss_sword_desc: 'Убить босса мечом',
        ach_boss_arrow_title: 'Стрелок',
        ach_boss_arrow_desc: 'Убить босса стрелой',
        ach_full_hp_title: 'Танк',
        ach_full_hp_desc: 'Пройти уровень с полным HP',
        ach_locked: '???',

        // === Levels ===
        level_0_name: 'Обучение',
        level_1_name: 'Змейка',
        level_2_name: 'Лабиринт Минотавра',
        level_3_name: 'Крепость',
        level_4_name: 'Спираль',
        level_5_name: 'Параллельные миры',
        level_6_name: 'Туннели',
        level_7_name: 'Решётка',
        level_8_name: 'Лабиринт теней',
        level_9_name: 'Двойная спираль',
        level_10_name: 'Хаос',
        level_11_name: 'Арена босса',

        // === PlacementTypes ===
        pt_wall: 'Стена',
        pt_erase: 'Стереть',
        pt_start: 'Старт',
        pt_finish: 'Финиш',
        pt_enemy: 'Враг',
        pt_patrol: 'Страж',
        pt_boss: 'Босс 2×2',
        pt_key: 'Ключ',
        pt_sword: 'Меч',
        pt_buffHp: '+1 HP',
        pt_buffInv: 'Щит',
        pt_bow: 'Лук',
        pt_secret: 'Трещина',
        pt_secretBoss: 'Секретный босс',
        pt_secretBossArena: 'Арена секр. босса',

        // === Editor messages ===
        editor_click_heart: '💗 Кликните по проходимой клетке — сердце появится на карте. Можно несколько.',
        editor_click_crack: '💥 Кликните по стене лабиринта — трещина ведёт на арену секретного босса.',
        editor_need_crack_wall: '❌ Сначала поставьте трещину 💗 на стену.',
        editor_arena_preview: '💗 Превью арены: сердце босса по центру, портал-выход у входа.',
        editor_saved: '✅ Карта сохранена! Она в списке карт.',
        editor_json_copied: '✅ JSON скопирован в буфер обмена',
        editor_json_export: '✅ Экспорт: JSON в поле ниже.',
        editor_json_invalid: '❌ Неверный JSON карты.',
        editor_imported: '✅ Уровень импортирован.',
        editor_err_start_finish: 'Задайте старт и финиш.',
        editor_err_start_passable: 'Старт должен стоять на проходимой клетке.',
        editor_err_finish_passable: 'Финиш должен стоять на проходимой клетке.',
        editor_err_start_finish_same: 'Старт и финиш не должны совпадать.',
        editor_err_boss_bounds: 'Босс выходит за границы лабиринта.',
        editor_err_boss_passable: 'Босс должен стоять на проходимом блоке 2×2.',
        editor_err_boss_need_sword: 'На босс-карте нужен меч ⚔ или трещина 🗝 (чтобы победить босса).',
        editor_err_crack_edge: 'Трещина 🗝 должна быть на внутренней стене (не по краю).',
        editor_err_crack_wall: 'Трещина 🗝 должна быть на стене.',
        editor_err_sbe_edge: 'Трещина 💗 секретного босса должна быть на внутренней стене (не по краю).',
        editor_err_sbe_wall: 'Трещина 💗 секретного босса должна быть на стене.',
        editor_err_cracks_same: 'Трещины 🗝 и 💗 не должны совпадать.',
        editor_err_sbe_reachable: 'Трещина 💗 секретного босса должна быть достижима со стороны прохода.',
        editor_err_heart_need_sword: 'С сердечками 💗 нужен меч ⚔ или трещина 🗝 (чтобы победить босса).',
        editor_err_no_path: 'Нет пути от старта до финиша!',

        // === Navigation ===
        nav_reset_confirm: 'Удалить монеты, покупки магазина, достижения и прогресс карт?\n\nВсе уровни будут сброшены.',

        // Language screen
        lang_title: '🌐 Язык / Language',
        lang_ru: 'Русский',
        lang_en: 'English',
    },

    en: {
        // === index.html ===
        html_title: 'Labyrinth — 12 maps',
        menu_title: '🏰 Labyrinth with Enemies',
        btn_play: '🎮 Play (continue from first uncompleted)',
        btn_levels: '🗺 Select map',
        btn_difficulty: '⚙️ Difficulty',
        btn_tutorial: '📖 How to play',
        btn_admin: '🔧 Admin panel',
        btn_editor: '🛠 Map editor',
        btn_achievements: '🏆 Achievements',
        btn_reset: '🗑 Reset all',
        btn_lang: '🌐 Language',

        // Password screen
        password_title: '🔒 Enter password',
        password_placeholder: 'Password',
        password_submit: 'Enter',
        password_back: '← Back',
        password_wrong: '❌ Wrong password',

        // Level select
        level_select_title: '🗺 Select map (1–11)',
        level_locked_title: '🔒 Complete previous maps',

        // Difficulty
        difficulty_title: '⚙️ Select difficulty',
        diff_easy: '🟢 Easy',
        diff_easy_desc: '2 enemies, aggro 4',
        diff_medium: '🟡 Medium',
        diff_medium_desc: '3 enemies, aggro 3, 🔑 keys',
        diff_hard: '🔴 Hard',
        diff_hard_desc: '4 enemies, aggro 2, 🔑+🌫',

        // Tutorial
        tutorial_title: '📖 How to play',
        tutorial_goal: '🎯 Goal: reach the finish F.',
        tutorial_controls: '🎮 Controls: WASD or Arrow keys',
        tutorial_maps: '🗺 12 maps: "0 · Tutorial" for beginners + 11 challenging and completable!',
        tutorial_level0: '0️⃣ Tutorial level: collect 🔑 keys, find 🗝 crack in the wall, grab ⚔ sword, defeat 👾 enemies and reach the finish.',
        tutorial_enemies: '👀 Enemies: see in straight line — chase.',
        tutorial_keys: '🔑 Keys: on medium and hard you need to collect both parts to unlock the finish.',
        tutorial_fog: '🌫 Fog of war: on hard the map is hidden, explore it.',
        tutorial_finish: '🔒 Finish: locked when being chased.',
        tutorial_secret: '⚔ Secret room (10%): find the crack, grab the sword and hit enemies and boss with Space. On Tutorial the crack is always there.',
        tutorial_continue: 'Continue →',
        tutorial_back: '← Back',

        // Admin panel
        admin_title: '🔧 Admin panel',
        admin_normal_enemies: 'Regular enemies',
        admin_count: 'Count:',
        admin_patrol: 'Guards (triangles)',
        admin_distribution: 'Distribution:',
        admin_normal: 'Normal:',
        admin_patrol_label: 'Guards:',
        admin_behavior: 'Behavior settings',
        admin_agro: 'Aggro (turns):',
        admin_vision: 'Vision:',
        admin_special: 'Special modes',
        admin_finish_lock: 'Lock finish:',
        admin_invincible: 'Invincible:',
        admin_keys: 'Keys (2 parts):',
        admin_fog: 'Fog of war:',
        admin_fog_radius: 'Fog radius:',
        admin_apply: '✅ Apply',
        admin_applied: '✅ Applied!',
        admin_yes: 'Yes',
        admin_no: 'No',

        // Editor
        editor_title: '🛠 Map editor',
        editor_name: 'Name:',
        editor_name_default: 'My level',
        editor_size: 'Size:',
        editor_test: '▶ Test',
        editor_save: '💾 Save',
        editor_export: '📋 Export',
        editor_import_btn: '📥 Import',
        editor_preview: '💗 Arena preview',
        editor_new: '🆕 New',
        editor_menu: '↩ To menu',
        editor_import_placeholder: 'Paste map JSON here to import',

        // Game screen
        game_title: '🏰 Labyrinth',
        game_legend: 'WASD or Arrows | 🔒 locked | 🔓 open | 🔑 key | 🗝 wall passage (10%) | ⚔ swing — Space | 👹 boss: 6 sword hits, fire attacks 🔥 | Level {0}/11',
        game_restart: '🔁 Restart',
        game_other_level: '🔄 Other level',
        game_to_menu: '← To menu',

        // Achievements
        achievements_title: '🏆 Achievements',

        // End screen
        end_victory: '🏆 VICTORY!',
        end_defeat: '💀 DEFEAT!',
        end_next: '➡ Next level',
        end_preview_done: 'Map preview complete!',
        end_all_done: 'All maps completed!',
        end_next_msg: 'Great job! Next level awaits.',
        end_coins_note: ' (+{0} 🪙, balance: {1} 🪙)',

        // === Game.js messages ===
        msg_status_spotted: '⚠️ Spotted!',
        msg_status_searching: '🔍 Searching.',
        msg_status_waiting: '⏳ Waiting ({0}/{1}).',
        msg_keys_collect: '🔑 Collect key parts ({0}/{1}).',
        msg_finish_locked: '🔒 Finish locked!',
        msg_finish_open: '🔓 Open!',

        // Tutorial hints
        tut_collect_keys: '🔑 Collect both key parts ({0}/{1}). {2}',
        tut_find_crack: '🗝 Find the crack in the wall — ⚔ sword behind it. {0}',
        tut_kill_enemies: '⚔ Hit enemies with Space!',
        tut_go_finish: '🏁 Go to the finish!',

        // Start message
        start_map: '🗺 Map {0}: "{1}".',
        start_collect_keys: ' 🔑 Collect {0} key parts to unlock the finish.',
        start_finish_chase: ' 🔒 Finish locked when being chased.',
        start_fog: ' 🌫 Fog of war: explore the map.',
        start_invincible: '🛡 Invincible. ',
        start_tutorial_hint: ' 📖 Collect 🔑 keys, find 🗝 crack in the wall, grab ⚔ sword, defeat enemies and reach the finish.',

        // Arrow messages
        msg_boss_arrow_killed: '🏹 Boss defeated by arrow! Finish unlocked!',
        msg_boss_enraged: '🔥 Boss enraged! Strikes remaining: {0}',
        msg_boss_arrow_hit: '🏹 Boss wounded! HP remaining: {0}',
        msg_enemy_arrow_killed: '🏹 {0} killed by arrow!',

        // Shop
        msg_shop_enter: '🛒 Shop! Walk to a pedestal to buy.',
        msg_shop_exit: 'Exited shop.',
        msg_shop_bought: '✅ Bought: {0} {1}! (balance: {2} 🪙)',
        msg_shop_fail: '❌ {0}',

        shop_confirm_buy: 'Buy',
        shop_confirm_cancel: 'Cancel',
        shop_confirm_price: 'Price: {0} 🪙',
        shop_confirm_coins: 'Your balance: {0} 🪙',

        // Secret boss
        msg_secret_boss_defeated_first: '💖 Secret boss defeated! (+30 coins)',
        msg_secret_boss_defeated: '💖 Secret boss defeated!',
        msg_secret_boss_repelled: '💖 Boss knocked back! HP remaining: {0}',
        msg_secret_boss_arena_enter: '💖 Secret boss! Defeat the pink heart and get 30 coins!',
        msg_secret_boss_arena_defeated: '💖 Secret boss already defeated. Exit through the crack.',
        msg_secret_boss_arena_exit: 'Exited secret boss arena.',

        // Secret room
        msg_secret_room: '🗝 Secret room! Grab ⚔ sword or return through the portal.',
        msg_got_sword: '⚔ You got the sword! Now Space — swing at enemies.',
        msg_secret_exit: 'Exited secret room.',

        // === Player.js messages ===
        msg_heart_repelled: '🛡 Heart knocked back.',
        msg_boss_repelled: '🛡 Boss knocked back.',
        msg_enemy_repelled: '🛡 Enemy knocked back.',
        msg_key_found: '🔑 Key part found ({0}/{1})!',
        msg_defeat_boss_first: '👹 Defeat the boss first!',
        msg_need_both_keys: '🔑 Both key parts needed ({0}/{1})!',
        msg_finish_blocked: '🔒 Finish blocked!',
        msg_got_sword_pickup: '⚔ You got the sword! Now Space — swing at enemies.',
        msg_hp_bonus: '❤ +1 HP! ({0}/{1})',
        msg_got_invincible: '🛡 Invincible until end of map!',
        msg_got_bow: '🏹 You got the bow! Now E — shoot.',
        msg_victory: '🏆 VICTORY!',
        msg_no_sword: '⚔ You have no sword!',
        msg_swing_miss: '⚔ Swing missed!',
        msg_enemy_sword_killed: '⚔ {0} killed by sword!',
        msg_no_bow: '🏹 You have no bow!',
        msg_bow_reloading: '🏹 Reloading...',
        msg_bow_no_direction: '🏹 Move first to choose direction!',
        msg_arrow_shot: '🏹 Arrow fired!',

        // Damage messages
        msg_defeat_heart: '💀 DEFEAT! Pink heart touched you!',
        msg_defeat_bomb: '💀 DEFEAT! Bomb exploded!',
        msg_defeat_boss_touch: '💀 DEFEAT! Boss 👹 caught you!',
        msg_defeat_enemy_touch: '💀 DEFEAT! You ran into {0}!',
        msg_defeat_fire: '💀 DEFEAT! Boss fire caught you!',
        msg_hurt: '💔 You are hurt! HP remaining: {0}/{1}',

        // === Enemy messages ===
        msg_enemy_catch: '💀 DEFEAT! {0} caught you!',
        msg_enemy_repel: '🛡 Enemy knocked back.',

        // Patrol messages
        msg_patrol_catch: '💀 DEFEAT! Guard {0} caught you!',
        msg_patrol_repel: '🛡 Guard knocked back.',

        // Boss messages
        msg_boss_defeated: '👹 Boss defeated! Finish unlocked!',
        msg_boss_enraged: '🔥 Boss enraged! Strikes remaining: {0}',
        msg_boss_repelled_hp: '⚔ Boss knocked back! Strikes remaining: {0}',
        msg_boss_catch: '💀 DEFEAT! Boss 👹 caught you!',

        // === Renderer HUD ===
        hud_health: '❤ Health: {0} ({1}/{2})',
        hud_coins: '🪙 {0}',
        hud_level_preview: '🏰 {0} (preview)',
        hud_level: '🏰 {0} ({1}/{2})',

        // === Shop items ===
        shop_sword_name: 'Sword',
        shop_sword_desc: 'Start each level with a sword (swing — Space)',
        shop_hp_name: '+1 max HP',
        shop_hp_desc: 'Maximum health +1 (up to +3)',
        shop_sword_plus_name: 'Upgraded sword',
        shop_sword_plus_desc: 'Deals 2 damage to boss per swing (requires sword)',
        shop_bow_name: 'Bow',
        shop_bow_desc: 'Ranged weapon (E — shoot, infinite arrows)',
        shop_err_not_found: 'Item not found',
        shop_err_bought: 'Already bought',
        shop_err_no_coins: 'Not enough coins',
        shop_err_need_sword: 'Requires sword',

        // === Achievements ===
        ach_first_blood_title: 'First Blood',
        ach_first_blood_desc: 'Kill the first enemy with a sword',
        ach_slayer_10_title: 'Slayer',
        ach_slayer_10_desc: 'Kill 10 enemies',
        ach_slayer_50_title: 'Terminator',
        ach_slayer_50_desc: 'Kill 50 enemies',
        ach_slayer_100_title: 'Sword Legend',
        ach_slayer_100_desc: 'Kill 100 enemies',
        ach_archer_title: 'Archer',
        ach_archer_desc: 'Fire the first arrow',
        ach_bow_master_title: 'Bow Master',
        ach_bow_master_desc: 'Kill 10 enemies with arrows',
        ach_first_boss_title: 'Fallen Titan',
        ach_first_boss_desc: 'Defeat the first boss',
        ach_all_bosses_title: 'God of Killers',
        ach_all_bosses_desc: 'Defeat all 3 bosses',
        ach_secret_killer_title: 'Heart Hunter',
        ach_secret_killer_desc: 'Defeat the secret boss',
        ach_secret_hunter_title: 'Secret Hunter',
        ach_secret_hunter_desc: 'Find the secret room',
        ach_shopaholic_title: 'Shopaholic',
        ach_shopaholic_desc: 'Buy something from the shop',
        ach_collector_title: 'Collector',
        ach_collector_desc: 'Buy everything from the shop',
        ach_rich_title: 'Rich',
        ach_rich_desc: 'Accumulate 200 coins',
        ach_mega_rich_title: 'Tycoon',
        ach_mega_rich_desc: 'Accumulate 500 coins',
        ach_level_1_title: 'Newcomer',
        ach_level_1_desc: 'Complete the first level',
        ach_level_5_title: 'Traveler',
        ach_level_5_desc: 'Complete 5 maps',
        ach_all_levels_title: 'Conqueror',
        ach_all_levels_desc: 'Complete all 12 maps',
        ach_no_damage_title: 'Flawless',
        ach_no_damage_desc: 'Complete a level without losing HP',
        ach_speedrunner_title: 'Lightning Fast',
        ach_speedrunner_desc: 'Complete a level in < 50 moves',
        ach_tutorial_done_title: 'Graduate',
        ach_tutorial_done_desc: 'Complete the tutorial',
        ach_coin_1000_title: 'Treasury',
        ach_coin_1000_desc: 'Earn 1000 coins total',
        ach_sword_plus_title: 'Fire Sword',
        ach_sword_plus_desc: 'Buy the upgraded sword',
        ach_boss_sword_title: 'Swordsman',
        ach_boss_sword_desc: 'Kill the boss with a sword',
        ach_boss_arrow_title: 'Marksman',
        ach_boss_arrow_desc: 'Kill the boss with an arrow',
        ach_full_hp_title: 'Tank',
        ach_full_hp_desc: 'Complete a level with full HP',
        ach_locked: '???',

        // === Levels ===
        level_0_name: 'Tutorial',
        level_1_name: 'Snake',
        level_2_name: "Minotaur's Labyrinth",
        level_3_name: 'Fortress',
        level_4_name: 'Spiral',
        level_5_name: 'Parallel Worlds',
        level_6_name: 'Tunnels',
        level_7_name: 'Grid',
        level_8_name: 'Shadow Labyrinth',
        level_9_name: 'Double Spiral',
        level_10_name: 'Chaos',
        level_11_name: 'Boss Arena',

        // === PlacementTypes ===
        pt_wall: 'Wall',
        pt_erase: 'Erase',
        pt_start: 'Start',
        pt_finish: 'Finish',
        pt_enemy: 'Enemy',
        pt_patrol: 'Guard',
        pt_boss: 'Boss 2×2',
        pt_key: 'Key',
        pt_sword: 'Sword',
        pt_buffHp: '+1 HP',
        pt_buffInv: 'Shield',
        pt_bow: 'Bow',
        pt_secret: 'Crack',
        pt_secretBoss: 'Secret boss',
        pt_secretBossArena: 'Secret boss arena',

        // === Editor messages ===
        editor_click_heart: '💗 Click a passable cell — heart appears on the map. Multiple allowed.',
        editor_click_crack: '💥 Click a wall — crack leads to secret boss arena.',
        editor_need_crack_wall: '❌ Place the 💗 crack on a wall first.',
        editor_arena_preview: '💗 Arena preview: boss heart in center, portal exit at entrance.',
        editor_saved: '✅ Map saved! It\'s in the map list.',
        editor_json_copied: '✅ JSON copied to clipboard',
        editor_json_export: '✅ Export: JSON in the field below.',
        editor_json_invalid: '❌ Invalid map JSON.',
        editor_imported: '✅ Level imported.',
        editor_err_start_finish: 'Set start and finish.',
        editor_err_start_passable: 'Start must be on a passable cell.',
        editor_err_finish_passable: 'Finish must be on a passable cell.',
        editor_err_start_finish_same: 'Start and finish must not overlap.',
        editor_err_boss_bounds: 'Boss is outside the maze bounds.',
        editor_err_boss_passable: 'Boss must be on a passable 2×2 block.',
        editor_err_boss_need_sword: 'Boss map needs a ⚔ sword or 🗝 crack (to defeat the boss).',
        editor_err_crack_edge: '🗝 Crack must be on an inner wall (not on the edge).',
        editor_err_crack_wall: '🗝 Crack must be on a wall.',
        editor_err_sbe_edge: '💗 Secret boss crack must be on an inner wall (not on the edge).',
        editor_err_sbe_wall: '💗 Secret boss crack must be on a wall.',
        editor_err_cracks_same: '🗝 and 💗 cracks must not overlap.',
        editor_err_sbe_reachable: '💗 Secret boss crack must be reachable from a passage.',
        editor_err_heart_need_sword: 'With 💗 hearts, need a ⚔ sword or 🗝 crack (to defeat the boss).',
        editor_err_no_path: 'No path from start to finish!',

        // === Navigation ===
        nav_reset_confirm: 'Delete coins, shop purchases, achievements and level progress?\n\nAll levels will be reset.',

        // Language screen
        lang_title: '🌐 Language / Язык',
        lang_ru: 'Русский',
        lang_en: 'English',
    }
};

// Текущий язык
let currentLang = localStorage.getItem(I18N_KEY) || 'ru';

/**
 * Получить переведённую строку по ключу
 * @param {string} key - ключ словаря
 * @param {...*} args - аргументы для подстановки ({0}, {1}, ...)
 * @returns {string}
 */
function t(key) {
    const dict = I18N[currentLang] || I18N.ru;
    let str = dict[key] || I18N.ru[key] || key;
    // Подстановка {0}, {1}, ...
    for (let i = 1; i < arguments.length; i++) {
        str = str.replace('{' + (i - 1) + '}', arguments[i]);
    }
    return str;
}

/**
 * Получить текущий язык
 * @returns {string} 'ru' или 'en'
 */
function getLang() {
    return currentLang;
}

/**
 * Переключить язык
 * @param {string} lang - 'ru' или 'en'
 */
function setLang(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    currentLang = lang;
    localStorage.setItem(I18N_KEY, lang);
    document.documentElement.lang = lang;
    applyUITranslations();
}

/**
 * Применить переводы ко всем элементам UI с data-i18n
 */
function applyUITranslations() {
    // Текстовые элементы
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const args = el.getAttribute('data-i18n-args');
        if (args) {
            el.textContent = t(key, ...args.split(','));
        } else {
            el.textContent = t(key);
        }
    });

    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // HTML title
    document.title = t('html_title');

    // Обновляем заголовок уровня в меню (renderLevelButtons пересоздаёт кнопки)
    if (typeof renderLevelButtons === 'function') {
        const levelScreen = document.getElementById('level-select-screen');
        if (levelScreen && !levelScreen.classList.contains('hidden')) {
            renderLevelButtons();
        }
    }

    // Обновляем ачивки, если экран открыт
    if (typeof renderAchievementsScreen === 'function') {
        const achScreen = document.getElementById('achievements-screen');
        if (achScreen && !achScreen.classList.contains('hidden')) {
            renderAchievementsScreen();
        }
    }
}
