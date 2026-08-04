// ==================== ГЛАВНЫЙ ФАЙЛ ИГРЫ ====================

/**
 * Глобальные переменные
 */
let currentGame = null; // Текущая игра

/**
 * Инициализация новой игры
 */
function initGame() {
    // Останавливаем музыку секретной комнаты и арены босса от прошлой игры
    if (currentGame) {
        currentGame.stopSecretMusic();
        currentGame.stopBossMusic();
        currentGame.stopShopMusic();
        currentGame.stopSecretBossMusic();
    }
    // Останавливаем музыку меню
    stopMenuMusic();
    const settings = getSettings();
    currentGame = new Game(selectedLevel, settings);
    currentGame.renderer.draw();
}

/**
 * Перезапуск игры со случайным уровнем
 */
function restartGame() {
    selectedLevel = Math.floor(Math.random() * getTotalLevels());
    initGame();
}

/**
 * Перезапуск текущего уровня
 */
function restartLevel() {
    initGame();
}

/**
 * Переход к следующему уровню (или в меню после последнего)
 */
function nextLevel() {
    if (selectedLevel >= getTotalLevels() - 1) {
        stopGameMusic();
        backToMenu();
        return;
    }
    if (LEVELS[selectedLevel] && LEVELS[selectedLevel].tutorial) {
        stopGameMusic();
        backToMenu();
        return;
    }
    selectedLevel++;
    initGame();
}

/**
 * Остановить всю музыку текущей игры (перед выходом в меню)
 */
function stopGameMusic() {
    if (currentGame) {
        currentGame.stopSecretMusic();
        currentGame.stopBossMusic();
        currentGame.stopShopMusic();
        currentGame.stopSecretBossMusic();
    }
}

/**
 * Запуск превью уровня из редактора (без сохранения в список)
 * @param {Object} level - объект уровня
 */
function initPreviewLevel(level) {
    if (currentGame) {
        currentGame.stopSecretMusic();
        currentGame.stopBossMusic();
        currentGame.stopShopMusic();
        currentGame.stopSecretBossMusic();
    }
    stopMenuMusic();
    currentGame = new Game(-1, getSettings(), level);
    currentGame.renderer.draw();
}

/**
 * Обработчик нажатий клавиш
 * Поддерживает: WASD, ЦФЫВ, стрелки, NumPad
 */
document.addEventListener('keydown', (e) => {
    // Предотвращаем скролл страницы при нажатии стрелок
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    // Игнорируем нажатия, если игра не активна или окончена
    if (!currentGame || !currentGame.gameRunning || currentGame.gameOver) return;

    const key = e.key.toLowerCase();
    let moved = false;

    // Движение вверх: W, Ц, Стрелка вверх, NumPad 8
    if (key === 'ц' || key === 'w' || key === 'arrowup' || key === 'numpad8') {
        currentGame.player.move(-1, 0, currentGame);
        moved = true;
    }
    // Движение влево: A, Ф, Стрелка влево, NumPad 4
    else if (key === 'ф' || key === 'a' || key === 'arrowleft' || key === 'numpad4') {
        currentGame.player.move(0, -1, currentGame);
        moved = true;
    }
    // Движение вниз: S, Ы, Стрелка вниз, NumPad 2
    else if (key === 'ы' || key === 's' || key === 'arrowdown' || key === 'numpad2') {
        currentGame.player.move(1, 0, currentGame);
        moved = true;
    }
    // Движение вправо: D, В, Стрелка вправо, NumPad 6
    else if (key === 'в' || key === 'd' || key === 'arrowright' || key === 'numpad6') {
        currentGame.player.move(0, 1, currentGame);
        moved = true;
    }
    // Диагональные движения с NumPad (опционально)
    else if (key === 'numpad7') {
        // Вверх-влево
        currentGame.player.move(-1, 0, currentGame);
        currentGame.player.move(0, -1, currentGame);
        moved = true;
    }
    else if (key === 'numpad9') {
        // Вверх-вправо
        currentGame.player.move(-1, 0, currentGame);
        currentGame.player.move(0, 1, currentGame);
        moved = true;
    }
    else if (key === 'numpad1') {
        // Вниз-влево
        currentGame.player.move(1, 0, currentGame);
        currentGame.player.move(0, -1, currentGame);
        moved = true;
    }
    else if (key === 'numpad3') {
        // Вниз-вправо
        currentGame.player.move(1, 0, currentGame);
        currentGame.player.move(0, 1, currentGame);
        moved = true;
    }
    // Взмах мечом: Пробел
    else if (e.code === 'Space') {
        currentGame.player.swing(currentGame);
        moved = true;
    }

    // Перерисовываем после движения
    if (moved && currentGame) {
        currentGame.renderer.draw();
    }
});

/**
 * Обработчик для сенсорных устройств (свайпы)
 */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (!currentGame || !currentGame.gameRunning || currentGame.gameOver) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (!currentGame || !currentGame.gameRunning || currentGame.gameOver) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // Определяем направление свайпа
    if (Math.abs(dx) > Math.abs(dy)) {
        // Горизонтальный свайп
        if (dx > 30) {
            currentGame.player.move(0, 1, currentGame); // Вправо
        } else if (dx < -30) {
            currentGame.player.move(0, -1, currentGame); // Влево
        }
    } else {
        // Вертикальный свайп
        if (dy > 30) {
            currentGame.player.move(1, 0, currentGame); // Вниз
        } else if (dy < -30) {
            currentGame.player.move(-1, 0, currentGame); // Вверх
        }
    }

    currentGame.renderer.draw();
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Игра "Лабиринт" загружена и готова к работе!');
    console.log('Управление: WASD, ЦФЫВ или стрелки');
    if (typeof initTutorialGate === 'function') initTutorialGate();
});