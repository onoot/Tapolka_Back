import crypto from 'crypto';

// Утилита для преобразования объекта в URLSearchParams строку
const objectToSearchParams = (obj) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object') {
      params.append(key, encodeURIComponent(JSON.stringify(value)));
    } else {
      params.append(key, value);
    }
  }
  return params.toString();
};

export const validateTelegramData = (initData, botToken) => {
  try {
    // Если данные пришли как объект - конвертируем в строку
    const dataString = typeof initData === 'string' 
      ? initData 
      : objectToSearchParams(initData);

    const searchParams = new URLSearchParams(dataString);
    
    // Получаем и проверяем хеш
    const hash = searchParams.get('hash');
    if (!hash) return false;

    // Создаем клон для проверки подписи
    const checkParams = new URLSearchParams(dataString);
    checkParams.delete('hash');

    // Сортируем и формируем строку
    const dataCheckArr = Array.from(checkParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`);

    const dataCheckString = dataCheckArr.join('\n');

    // Генерируем HMAC
    const secret = crypto.createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const signature = crypto.createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    return signature === hash;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
};

export const parseTelegramData = (initData) => {
  try {
    // Конвертируем объект в строку при необходимости
    const dataString = typeof initData === 'string'
      ? initData
      : objectToSearchParams(initData);

    const searchParams = new URLSearchParams(dataString);
    
    // Декодируем user
    const userStr = searchParams.get('user');
    const user = userStr ? JSON.parse(decodeURIComponent(userStr)) : null;

    return {
      query_id: searchParams.get('query_id'),
      user,
      auth_date: searchParams.get('auth_date'),
      hash: searchParams.get('hash'),
      signature: searchParams.get('signature')
    };
  } catch (error) {
    console.error('Parsing error:', error);
    return null;
  }
};