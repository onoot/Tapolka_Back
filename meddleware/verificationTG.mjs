import crypto from 'crypto';
import { json } from 'stream/consumers';

export function validateTelegramData(telegramInitData, apiToken) {
    try{
    console.log('telegramInitData:', telegramInitData);
    const initData = new URLSearchParams(telegramInitData);
    console.log('initData:', initData);
    const hash = initData.get("hash");
    if (!hash) return false;
    initData.delete("hash");

    const dataToCheck = [...initData.entries()]
        .map(([key, value]) => {
            let processedValue = decodeURIComponent(value);
            if (key === "user" && typeof processedValue === 'string' && processedValue.startsWith('{') && processedValue.endsWith('}')) { //Более строгая проверка на JSON
                try {
                    processedValue = JSON.stringify(JSON.parse(processedValue)); // Парсим только если это похоже на JSON
                } catch (error) {
                    console.error("Ошибка парсинга user:", error);
                    return ""; // Или другое подходящее обработка ошибки
                }
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(processedValue)}`;
        })
        .sort()
        .join('\n');
    console.log("dataToCheck:", dataToCheck);

    const hmac = crypto.createHmac('sha256', "WebAppData"); //"WebAppData" - это ваш секретный ключ? Если нет, замените на переменную
    hmac.update(apiToken);
    const secretKey = hmac.digest();  //генерируем secretKey из apiToken

    const hmac2 = crypto.createHmac('sha256', secretKey);
    hmac2.update(dataToCheck);
    const _hash = hmac2.digest('hex');


    console.log("Original hash:", hash);
    console.log("Computed hash:", _hash);

    let user = null;
    try {
        user = JSON.parse(initData.get("user"));
    } catch (error) {
        console.error( JSON.stringify(user));
        console.error("Ошибка парсинга user:", error);
    }

    return { validate: hash === _hash, user };
}
catch (error) {
    console.error("Error:", error);
    return false;
}
}
