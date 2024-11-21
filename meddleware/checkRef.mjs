import User from '../models/User.mjs';

/**
 * Проверяет данные, создаёт нового пользователя и обновляет базу данных.
 *
 * @param {Object} input - Входные данные.
 * @param {Object} input.user - Объект Telegram-пользователя.
 * @param {string} input.ref - Реферальный код (ID пригласившего).
 *
 * @returns {Promise<Object>} - Результат операции.
 */
export const processReferral = async ({ user, ref }) => {
  try {
    // Проверка: существует ли пользователь с данным telegramId
    let existingUser = await User.findOne({ where: { telegramId: user.id } });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Поиск реферера по реферальному коду
    const referrer = ref ? await User.findOne({ where: { telegramId: ref } }) : null;

    if (ref && !referrer) {
      throw new Error('Invalid referral code');
    }

    // Создаём нового пользователя
    const newUser = await User.create({
      telegramId: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      referral: ref || null, // сохраняем реферальный код
      name: user.first_name || 'Guest',
      money: 0,
      totalMoney: 0,
      profit: 0,
      energy: 1000,
      rank: 0,
      benefit: 0,
      Invited: referrer ? referrer.telegramId : null, // связываем с реферером
      roleId: 1,
      lastEnergyUpdate: new Date(),
    });

    // Обновляем счётчик реферера
    if (referrer) {
      await referrer.increment('Invited', { by: 1 });
    }

    return {
      success: true,
      message: 'User created successfully',
      user: newUser,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
