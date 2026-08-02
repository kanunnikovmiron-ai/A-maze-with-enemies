/**
 * Конфигурация частей ключа
 */
class KeyConfig {
    constructor(settings) {
        // Части ключа нужны, чтобы открыть финиш
        this.enabled = settings.keys === 'yes';
        this.count = 2;                              // Количество частей
        this.symbol = '🔑';                           // Символ части ключа
        this.color1 = '#fd0';                        // Цвет первой части (золото)
        this.color2 = '#ccc';                        // Цвет второй части (серебро)
    }
}
