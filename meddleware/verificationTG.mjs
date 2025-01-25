import crypto from 'crypto';

export const validateTelegramData = (initDataString, botToken) => {
    try {
        const params = new URLSearchParams(initDataString);
        const hash = params.get('hash');
        
        if (!hash) {
            console.error('Hash parameter is missing');
            return false;
        }

        // Собираем все параметры кроме hash
        const checkParams = new URLSearchParams();
        params.forEach((value, key) => {
            if (key !== 'hash') checkParams.append(key, value);
        });

        // Сортировка и формирование data_check_string
        const dataCheckString = Array.from(checkParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        console.log('DataCheckString:', dataCheckString); // Логируем для проверки

        // Генерация HMAC
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const signature = crypto.createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        console.log('Computed signature:', signature);
        console.log('Received hash:', hash);

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
