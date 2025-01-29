import crypto from 'crypto';

export const verifyTelegramWebAppData = (req, res, next) => {
    try {
        const initData = req.query.initData || req.body.initData;
        console.log("Получены данные:", initData);

        if (!initData) {
            return res.status(401).json({ error: 'No initialization data provided' });
        }

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return res.status(401).json({ error: 'Hash not found in init data' });
        }

        urlParams.delete('hash');

        // Изменяем формирование строки для проверки
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                // Для поля user преобразуем объект в строку JSON без пробелов
                if (key === 'user') {
                    try {
                        const userObj = JSON.parse(value);
                        // Удаляем photo_url из объекта пользователя
                        delete userObj.photo_url;
                        return `${key}=${JSON.stringify(userObj)}`;
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                        return `${key}=${value}`;
                    }
                }
                return `${key}=${value}`;
            })
            .join('\n');

        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('BOT_TOKEN not found in environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const secret = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.TELEGRAM_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            console.error('Hash verification failed');
            return res.status(401).json({ 
                error: 'Invalid hash',
                details: 'Hash verification failed'
            });
        }

        try {
            const userData = JSON.parse(urlParams.get('user') || '{}');
            req.telegramUser = userData;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return res.status(401).json({ 
                error: 'Invalid user data',
                details: e.message 
            });
        }

        next();
    } catch (error) {
        console.error('Telegram verification error:', error);
        res.status(401).json({ 
            error: 'Authentication failed',
            details: error.message 
        });
    }
}; 