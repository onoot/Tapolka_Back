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
        console.log("urlParams", urlParams);

        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                if (key === 'user') {
                    try {
                        // Проверяем, является ли значение строкой '[object Object]'
                        if (value === '[object Object]') {
                            // Получаем оригинальный объект пользователя из req.body
                            const userObj = req.body.user;
                            if (userObj && typeof userObj === 'object') {
                                delete userObj.photo_url;
                                return `${key}=${JSON.stringify(userObj)}`;
                            }
                        }
                        // Если это не '[object Object]', пробуем декодировать и распарсить
                        const decodedValue = decodeURIComponent(value);
                        const userObj = JSON.parse(decodedValue);
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
            // Используем объект пользователя из req.body
            const userData = req.body.user;
            if (!userData || typeof userData !== 'object') {
                throw new Error('Invalid user data format');
            }
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