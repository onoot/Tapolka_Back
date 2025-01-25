import crypto from 'crypto';

export const validateTelegramData = (initData, botToken) => {
    try {
        // 1. Создаем копию объекта, чтобы не мутировать исходные данные
        const dataCopy = { ...initData };
        
        // 2. Сериализуем user с двойным кодированием
        if (dataCopy.user && typeof dataCopy.user === 'object') {
            dataCopy.user = encodeURIComponent(JSON.stringify(dataCopy.user));
        }

        // 3. Формируем URLSearchParams из скопированных данных
        const params = new URLSearchParams(dataCopy);
        
        // 4. Извлекаем hash и проверяем его наличие
        const hash = params.get('hash');
        if (!hash) {
            console.error('Hash parameter is missing');
            return false;
        }

        // 5. Создаем клон параметров без hash
        const checkParams = new URLSearchParams(params.toString());
        checkParams.delete('hash');

        // 6. Сортируем параметры по алфавиту и формируем data_check_string
        const dataCheckString = Array.from(checkParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        console.log('DataCheckString:', dataCheckString);

        // 7. Генерируем HMAC-подпись
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const signature = crypto.createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        console.log('Computed signature:', signature);
        console.log('Received hash:', hash);

        console.log(botToken)
        // 8. Возвращаем результат сравнения
        return signature === hash;
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
};

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
