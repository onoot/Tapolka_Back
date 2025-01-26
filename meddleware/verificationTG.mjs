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
export const validateTelegramData = (initData, botToken) =>  {
    try{
        console.log('initData:' , initData)
        const initData = new URLSearchParams(initData);
        console.log('initData:' , initData)
        // Получаем хеш из параметров
        const hash = initData.get("hash");
        if (!hash) return false;
        // Удаляем хеш из параметров
        initData.delete("hash");
       
        // Сортируем параметры и создаем строку data_check_string
        const dataToCheck = [...initData.entries()]
            .map(([key, value]) => {
                if (key == "user") {                
                  let new_value =  JSON.parse(decodeURIComponent(value)) ; // Декодируем и возвращаем в JSON для правильной сортировки
                //  console.log('new_value:' , new_value)
                //  delete new_value.photo_url
    
                  value = JSON.stringify(new_value)
                } else {
                    value = decodeURIComponent(value);
                }
                return `${key}=${value}`;
            })
            .sort()
            .join('\n');
        console.log("dataToCheck:", dataToCheck);
        // Генерация секретного ключа с использованием HMAC_SHA256 и apiToken
        const secretKey = crypto.createHmac('sha256', "WebAppData").update(apiToken).digest();
        console.log("secretKey:", secretKey);
        // Создаем HMAC хеш с использованием secretKey и строки данных
        const _hash = crypto.createHmac('sha256', secretKey).update(dataToCheck).digest('hex');
        console.log("Original hash:", hash);
        console.log("Computed hash:", _hash);
    
        return hash === _hash;
    }catch(e){
        console.log(e)
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
