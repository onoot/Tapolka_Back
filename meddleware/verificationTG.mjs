import crypto from 'crypto';

export const validateTelegramData = (searchParams, botToken) => {
    try {
        // Преобразуем строку initData в объект URLSearchParams
        // const searchParams = new URLSearchParams(initData);
        
        // Получаем hash из параметров
        const hash = searchParams.get('hash');
        if (!hash) return false;
        
        // Удаляем hash из проверяемых данных
        searchParams.delete('hash');
        
        // Сортируем оставшиеся параметры
        const dataCheckArr = Array.from(searchParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`);
            
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
            
        return signature === hash;
    } catch (error) {
        console.error('Ошибка валидации данных Telegram:', error);
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
