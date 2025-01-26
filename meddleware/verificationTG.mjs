import crypto from 'crypto';
/**
 * Checks if the given initData is a valid Telegram authorization data.
 * initData can be either a string or an object with the following properties:
 * - query_id: string
 * - user: object
 * - auth_date: string
 * - hash: string
 *
 * @param {string|object} initData - The data to check
 * @param {string} botToken - The bot token
 *
 * @returns {boolean} - True if the data is valid, false otherwise
 */

export const validateTelegramData = (telegramInitData, apiToken) => {
    try {
      const initData = new URLSearchParams(telegramInitData);
      const hash = initData.get("hash");
      if (!hash) return false;
  
      // Удаляем лишние параметры
      initData.delete("hash");
      initData.delete("signature");
  
      const dataToCheck = [...initData.entries()]
        .map(([key, value]) => {
          value = decodeURIComponent(value);
          if (key === "user") {
            const parsed = JSON.parse(value);
            delete parsed.photo_url; // Убедитесь, что удалено!
            return `${key}=${JSON.stringify(parsed)}`;
          }
          return `${key}=${value}`;
        })
        .sort()
        .join('\n');
  
      // Логи для отладки
      console.log("Final dataToCheck:", dataToCheck); // <-- Добавьте это!
      console.log("Expected hash:", hash);
  
      const secretKey = crypto.createHmac('sha256', "WebAppData")
        .update(apiToken)
        .digest();
  
      const _hash = crypto.createHmac('sha256', secretKey)
        .update(dataToCheck)
        .digest('hex');
  
      console.log("Computed hash:", _hash); // <-- Сравните с ожидаемым
  
      return hash === _hash;
    } catch (e) {
      console.error("Validation error:", e);
      return false;
    }
  };


/**
 * Парсит данные, полученные от Telegram.
 * 
 * @param {string} initData Строка с данными, полученными от Telegram
 * @returns {Object} Объект со следующими полями:
 *  - query_id: {string} ID запроса
 *  - user: {Object} Объект с информацией о пользователе
 *  - auth_date: {string} Дата авторизации
 *  - hash: {string} Хэш, по которому можно проверить подлинность данных
 * @throws {Error} Ошибка парсинга данных
 */
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
