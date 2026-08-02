/**
 * Конфигурация врагов
 */
class EnemyConfig {
    constructor(settings) {
        // Параметры поведения врагов
        this.visionRange = settings.visionRange;    // Дальность видимости
        this.agroLimit = settings.agroLimit;        // Лимит агрессии (ходов преследования)
        this.count = settings.enemyCount;           // Общее количество врагов
        // Количество стражей (не больше общего, 0 допустимо)
        const patrol = (settings.patrolCount === undefined || settings.patrolCount === null)
            ? 2 : settings.patrolCount;
        this.patrolCount = Math.min(patrol, settings.enemyCount);

        // Цвета для разных состояний обычных врагов
        this.colors = {
            chase: '#f22',           // Преследование - красный
            searching: '#f64',       // Поиск - оранжевый
            waiting: '#f80',         // Ожидание - темно-оранжевый
            returning: '#d90',       // Возврат - золотой
            patrol: '#c60'          // Патруль - коричневый
        };

        // Эффекты свечения для разных состояний
        this.glows = {
            chase: { color: '#f00', blur: 10 },
            searching: { color: '#f80', blur: 7 },
            waiting: { color: '#fa0', blur: 4 },
            returning: { color: 'transparent', blur: 0 },
            patrol: { color: 'transparent', blur: 0 }
        };

        // Идентификаторы врагов
        this.prefix = 'E'; // Префикс для ID обычных врагов
    }
}