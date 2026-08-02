/**
 * Конфигурация финиша
 */
class FinishConfig {
    constructor(settings) {
        this.lockWhenChased = settings.finishLock === 'yes'; // Блокировка при погоне
        this.lockedColor = '#a22';                            // Цвет заблокированного финиша
        this.lockedBgColor = '#3a1a1a';                       // Фон заблокированного финиша
        this.openColor = '#2a2';                              // Цвет открытого финиша
        this.openBgColor = '#1a3a1a';                         // Фон открытого финиша
        this.symbol = 'F';                                    // Символ финиша
    }
}