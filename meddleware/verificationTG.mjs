import crypto from 'crypto';

// Функция для проверки хеша и валидации данных Telegram
export function validateTelegramData(initData, SECRET_BOT_TOKEN) {
    try {
        // Извлекаем данные, кроме `hash`, и создаем строку для проверки данных
        const checkString = Object.keys(initData)
            .filter(key => key !== 'hash')
            .map(key => {
                let value = initData[key];
                // Преобразуем объект `user` в JSON-строку, если он присутствует
                if (key === 'user' && typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                return `${key}=${value}`;
            })
            .sort()  // Сортируем ключи по алфавиту
            .join('\n');  // Соединяем через перенос строки

        // Генерируем секретный ключ с помощью HMAC-SHA256 с токеном бота и строкой "WebAppData"
        const secretKey = crypto
            .createHmac('sha256', "WebAppData")
            .update(SECRET_BOT_TOKEN)
            .digest();

        // Вычисляем хеш строки проверки данных с помощью секретного ключа
        const hash = crypto
            .createHmac('sha256', secretKey)
            .update(checkString)
            .digest('hex');

        return hash === initData.hash;
    } catch (e) {
        console.error("Error in validation:", e);
        throw new Error('Invalid data');
    }
}
