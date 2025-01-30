import crypto from 'crypto';

export const verifyTelegramWebAppData = (req, res, next) => {
    try {
        const initData = req.body.initData; // Получаем из тела запроса
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
        
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                if (key === 'user') {
                    try {
                        const decodedValue = decodeURIComponent(value);
                        const userObj = JSON.parse(decodedValue);
                        delete userObj.photo_url;
                        return `${key}=${JSON.stringify(userObj)}`;
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                        return `${key}=${value}`;
                    }
                }
                return `${key}=${decodeURIComponent(value)}`; // Убедитесь, что значение также декодировано
            })
            .join('\n');

        console.log('dataCheckString:', dataCheckString); // Логирование для отладки

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

        console.log('Проверка хешей:', {
            received: hash,
            calculated: calculatedHash,
            dataCheckString
        });

        if (calculatedHash !== hash) {
            return res.status(401).json({ 
                error: 'Invalid hash',
                details: 'Hash verification failed'
            });
        }

        try {
            const userValue = urlParams.get('user');
            const decodedUserValue = decodeURIComponent(userValue);
            const userData = JSON.parse(decodedUserValue);
            console.log('Пользовательские данные:', userData); // Добавьте эту строку для отладки
            req.telegramUser = userData;
            next();
        } catch (e) {
            console.error('Error parsing user data:', e);
            return res.status(401).json({ 
                error: 'Invalid user data',
                details: e.message 
            });
        }
    } catch (error) {
        console.error('Telegram verification error:', error);
        res.status(401).json({ 
            error: 'Authentication failed',
            details: error.message 
        });
    }
};