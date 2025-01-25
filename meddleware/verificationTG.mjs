import crypto from 'crypto';

const logger = {
  log: (stage, message) => console.log(`[${new Date().toISOString()}] [${stage}] ${message}`),
  error: (stage, error) => console.error(`[${new Date().toISOString()}] [${stage}]`, error)
};

const objectToSearchString = (obj) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    const encodedValue = typeof value === 'object' 
      ? encodeURIComponent(JSON.stringify(value))
      : value;
    params.append(key, encodedValue);
  }
  return params.toString();
};

export const validateTelegramData = (initData, botToken) => {
  try {
    logger.log('VALIDATION', 'Starting validation process');
    
    // Конвертируем объект в строку если нужно
    const dataString = typeof initData === 'string' 
      ? initData 
      : objectToSearchString(initData);
    
    logger.log('VALIDATION', `Raw input data: ${dataString}`);

    const searchParams = new URLSearchParams(dataString);
    const hash = searchParams.get('hash');
    
    if (!hash) {
      logger.error('VALIDATION', 'Hash not found in initData');
      return false;
    }

    // Создаем клон без hash
    const checkParams = new URLSearchParams(dataString);
    checkParams.delete('hash');
    
    // Сортировка и формирование data_check_string
    const dataCheckArr = Array.from(checkParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        logger.log('VALIDATION', `Processing param: ${k}=${v}`);
        return `${k}=${v}`;
      });

    const dataCheckString = dataCheckArr.join('\n');
    logger.log('VALIDATION', `DataCheckString:\n${dataCheckString}`);

    // Генерация HMAC
    const secret = crypto.createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    logger.log('VALIDATION', `Secret key: ${secret.toString('hex')}`);

    const signature = crypto.createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    logger.log('VALIDATION', `Computed signature: ${signature}`);
    logger.log('VALIDATION', `Received hash:     ${hash}`);

    const isValid = signature === hash;
    logger.log('VALIDATION', `Validation result: ${isValid}`);
    
    return isValid;
  } catch (error) {
    logger.error('VALIDATION', error);
    return false;
  }
};

export const parseTelegramData = (initData) => {
  try {
    logger.log('PARSING', 'Starting parsing process');
    
    const dataString = typeof initData === 'string'
      ? initData
      : objectToSearchString(initData);

    logger.log('PARSING', `Input data: ${dataString}`);

    const searchParams = new URLSearchParams(dataString);
    
    // Извлекаем и декодируем user
    const userStr = searchParams.get('user');
    logger.log('PARSING', `Raw user string: ${userStr}`);

    const user = userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
    logger.log('PARSING', 'Parsed user object:', user);

    const result = {
      query_id: searchParams.get('query_id'),
      user,
      auth_date: searchParams.get('auth_date'),
      hash: searchParams.get('hash'),
      signature: searchParams.get('signature')
    };

    logger.log('PARSING', 'Final parsed object:', result);
    
    return result;
  } catch (error) {
    logger.error('PARSING', error);
    return null;
  }
};