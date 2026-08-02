/**
 * Конфигурация игрока
 */
class PlayerConfig {
    constructor(settings) {
        // Основные параметры игрока
        this.invincible = settings.invincible === 'yes';        // Неуязвимость
        this.color = this.invincible ? '#fa0' : '#37f';         // Цвет игрока
        this.bgColor = this.invincible ? '#4a3a1a' : '#1a3a6a'; // Цвет фона
        this.symbol = 'В';                                       // Символ игрока

        // Права доступа к финишу
        this.canFinishWhenChased = settings.finishLock !== 'yes'; // Может ли финишировать при погоне
    }
}