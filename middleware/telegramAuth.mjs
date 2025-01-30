import crypto from 'crypto';

export const verifyTelegramWebAppData = (req, res, next) => {
    try {
        const initData = req.query.initData || req.body.initData;
        console.log("Получены данные:", initData);

        if (!initData) {
            return res.status(401).json({ error: 'No initialization data provided' });
        }

        // Пробуем распарсить initData как JSON, если это строка
        let parsedInitData;
        try {
            parsedInitData = typeof initData === 'string' ? JSON.parse(initData) : initData;
        } catch (e) {
            console.log("initData не является JSON строкой, используем как есть");
            parsedInitData = initData;
        }

        const urlParams = new URLSearchParams(parsedInitData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return res.status(401).json({ error: 'Hash not found in init data' });
        }

        urlParams.delete('hash');
        console.log("urlParams", urlParams);

        // Получаем user напрямую из initData
        const userStr = urlParams.get('user');
        let user;
        try {
            user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        } catch (e) {
            console.error('Error parsing user string:', e);
            user = userStr;
        }

        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                if (key === 'user') {
                    const userObj = typeof value === 'object' ? value : user;
                    if (userObj && typeof userObj === 'object') {
                        const cleanUser = { ...userObj };
                        delete cleanUser.photo_url;
                        return `${key}=${JSON.stringify(cleanUser)}`;
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

        // Используем распарсенный объект пользователя
        if (user && typeof user === 'object') {
            req.telegramUser = user;
            next();
        } else {
            return res.status(401).json({ 
                error: 'Invalid user data',
                details: 'User data is not an object'
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