import crypto from 'crypto';

export const verifyTelegramWebAppData = (req, res, next) => {
    console.log("Ебааать",req?.body);
    console.log("Бляяять",req?.params);
    try {
        const initData = req.query.initData || req.body.initData;
        if (!initData) {
            return res.status(401).json({ error: 'No initialization data provided' });
        }

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Сортируем параметры
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Создаем HMAC
        const secret = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', secret)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            console.log('Пошел нахуй ишак', calculatedHash, hash);
            return res.status(401).json({ error: 'Invalid hash' });
        }

        next();
    } catch (error) {
        console.error('Telegram verification error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}; 