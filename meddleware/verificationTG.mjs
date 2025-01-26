import crypto from 'crypto';
/**
 * Checks if the given initData is a valid Telegram authorization data.
 * initData can be either a string or an object with the following properties:
 * - query_id: string
 * - user: object
 * - auth_date: string
 * - hash: string
 *
 * @param {string|object} initData - The data to check
 * @param {string} botToken - The bot token
 *
 * @returns {boolean} - True if the data is valid, false otherwise
 */
export const validateTelegramData = (initData, botToken) => {
    try {
        // Если initData - объект, преобразуем его в строку URLSearchParams
        let initDataString;
        if (typeof initData === 'object') {
            const params = new URLSearchParams();
            params.append('query_id', initData.query_id);
            params.append('user', encodeURIComponent(JSON.stringify(initData.user)));
            params.append('auth_date', initData.auth_date);
            params.append('hash', initData.hash);
            params.append('signature', initData.signature);
            initDataString = params.toString();
        } else {
            initDataString = initData;
        }

        // Преобразуем строку initData в объект URLSearchParams
        const searchParams = new URLSearchParams(initDataString);
        
        // Получаем hash из параметров
        const hash = searchParams.get('hash');
        if (!hash) return false;
        
        // Удаляем hash из проверяемых данных
        searchParams.delete('hash');
        
        // Сортируем оставшиеся параметры
        const dataCheckArr = Array.from(searchParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                // Если это поле user, декодируем его
                if (key === 'user') {
                    const userObj = JSON.parse(decodeURIComponent(value));
                    return `${key}=${JSON.stringify(userObj)}`; // Используем читаемый JSON
                }
                return `${key}=${value}`;
            });
            
        // Создаем строку для проверки
        const dataCheckString = dataCheckArr.join('\n');
        
        // Создаем HMAC
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
            
        // Вычисляем и сравниваем подпись
        const signature = crypto.createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');
            
        console.log('DataCheckString:', dataCheckString);
        console.log('Computed signature:', signature);
        console.log('Received hash:', hash);
        
        return signature === hash;
    } catch (error) {
        console.error('Ошибка валидации данных Telegram:', error);
        return false;
    }
};


/**
 * Парсит данные, полученные от Telegram.
 * 
 * @param {string} initData Строка с данными, полученными от Telegram
 * @returns {Object} Объект со следующими полями:
 *  - query_id: {string} ID запроса
 *  - user: {Object} Объект с информацией о пользователе
 *  - auth_date: {string} Дата авторизации
 *  - hash: {string} Хэш, по которому можно проверить подлинность данных
 * @throws {Error} Ошибка парсинга данных
 */
export const parseTelegramData = (initData) => {
    try {
        const searchParams = new URLSearchParams(initData);
        const userStr = searchParams.get('user');
        const user = JSON.parse(decodeURIComponent(userStr));
        
        return {
            query_id: searchParams.get('query_id'),
            user,
            auth_date: searchParams.get('auth_date'),
            hash: searchParams.get('hash')
        };
    } catch (error) {
        console.error('Ошибка парсинга данных Telegram:', error);
        return null;
    }
};
