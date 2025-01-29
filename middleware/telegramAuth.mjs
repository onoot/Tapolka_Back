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

        // Сортируем параметры
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('BOT_TOKEN not found in environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Создаем HMAC
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
            // return res.status(401).json({ 
            //     error: 'Invalid hash',
            //     details: 'Hash verification failed'
            // });
            console.error('Hash verification failed');
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