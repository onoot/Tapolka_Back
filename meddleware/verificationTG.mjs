import crypto from 'crypto';

export const validateTelegramData = (telegramInitData, apiToken) => {
  try {
    const initData = new URLSearchParams(telegramInitData);
    const hash = initData.get("hash");
    
    if (!hash) return false;

    // Удаляем служебные параметры
    initData.delete("hash");
    initData.delete("signature");

    const dataToCheck = [...initData.entries()]
      .map(([key, value]) => {
        const decodedValue = decodeURIComponent(value);
        
        if (key === "user") {
          const userObj = JSON.parse(decodedValue);
          delete userObj.photo_url; // Важно! Удаляем запрещенное поле
          return `${key}=${JSON.stringify(userObj)}`; // Сериализуем без пробелов
        }
        
        return `${key}=${decodedValue}`;
      })
      .sort() // Сортируем по алфавиту
      .join('\n');

    // Генерация секретного ключа (исправлено!)
    const secretKey = crypto
      .createHmac('sha256', "WebAppData") // Сначала хешируем константу
      .update(apiToken) // Затем добавляем токен бота
      .digest();

    // Вычисление хеша
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataToCheck)
      .digest('hex');

    return hash === computedHash;
  } catch (e) {
    console.error("Validation error:", e);
    return false;
  }
};

export const parseTelegramData = (initData) => {
  try {
    const searchParams = new URLSearchParams(initData);
    
    // Проверка обязательных полей
    if (!searchParams.has('user')) {
      throw new Error('Missing required field: user');
    }

    const userStr = searchParams.get('user');
    const user = JSON.parse(decodeURIComponent(userStr));
    
    return {
      query_id: searchParams.get('query_id'),
      user,
      auth_date: searchParams.get('auth_date'),
      hash: searchParams.get('hash')
    };
  } catch (error) {
    console.error('Telegram data parsing error:', error);
    return null;
  }
};