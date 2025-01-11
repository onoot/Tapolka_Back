import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import { Op } from 'sequelize';

import User from '../models/User.mjs';
import Role from '../models/Role.mjs';
import Task from '../models/Task.mjs';
import Daily from '../models/Daily.mjs';
import DailyCombo from '../models/DailyCombo.mjs';
import { validateTelegramData } from '../meddleware/verificationTG.mjs';
import { processReferral } from '../meddleware/checkRef.mjs';
import { type } from 'os';

dotenv.config();

const SECRET_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { JWT_SECRET } = process.env;
const { JWT_REFRESH_SECRET } = process.env;

export const getTime = () => {
  return moment().tz('Europe/London').toISOString();
};

export const validateTelegramInitData = (initData) => {
  return initData && typeof initData === 'string';
};

export const parseTelegramData = (initData) => {
  try {
    const data = JSON.parse(Buffer.from(initData, 'base64').toString());
    return data;
  } catch (e) {
    return null;
  }
};

// Функция для проверки и верификации JWT токена
export const login = async (req, res) => {
  try {
    const { query_id, user, auth_date, hash } = req.body;

    // Валидация данных от Telegram
    if (!validateTelegramData({ query_id, user, auth_date, hash }, SECRET_BOT_TOKEN)) {
      return res.status(401).json({ message: 'Invalid Telegram data valodation' });
    }

    // Проверка или создание пользователя в базе данных
    let existingUser = await User.findOne({
      where: { telegramId: user.id },
      include: { model: Role, as: 'role', attributes: ['name'] },
    });

    if (!existingUser) {
      existingUser = await User.create({
        telegramId: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username || '',
        money: 0,
        totalMoney: 0,
        profit: 0,
        energy: 500,
        rank: 0,
        benefit: 0,
        roleId: 4,
        lastEnergyUpdate: new Date(),
        combo_daily_tasks: user?.combo_daily_tasks || [],
        key: 0,
        boost: {
          fullEnergi: {
            count: 3,
            max_count: 3,
            dateLastUpdate: new Date().toISOString(),
          },
          multiplier: {
            level: 1,
            max_level: 100,
          },
          energiLimit: {
            level: 1,
            max_level: 100,
          }
        }
      });
    }
    if (!existingUser.boost) {
      existingUser.boost = {
        fullEnergi: {
          count: 3,
          max_count: 3,
          dateLastUpdate: new Date().toISOString(),
        },
        multiplier: {
          level: 1,
          max_level: 100,
        },
        energiLimit: {
          level: 1,
          max_level: 100,
        },
      };
      await existingUser.save();
    }

    const time = getTime();
    const Rewarw_Data = await DailyCombo.findAll({
      limit: 10, // Ограничиваем количество записей
      order: [['id', 'DESC']], // Сортируем по id в обратном порядке (опционально)
    });

    const filteredData = Rewarw_Data.filter(record => {
      try {
        if (!record.Data) {
          console.warn(`Запись с id ${record.id} не содержит поля Data. Пропускаем...`);
          return false;
        }

        const recordDate = new Date(record.Data);
        const currentDate = new Date(time);

        if (isNaN(recordDate.getTime())) {
          console.error(`Ошибка преобразования Data в дату для записи с id ${record.id}. Значение Data: ${record.Data}`);
          return false;
        }

        const result = recordDate > currentDate;
        return result;
      } catch (err) {
        console.error(`Ошибка обработки записи с id ${record.id}:`, err);
        return false;
      }
    });


    // Обновление энергии пользователя перед отправкой данных клиенту
    const updatedEnergy = await checkAndRegenerateEnergy(existingUser);

    // Создание JWT токена
    const token = jwt.sign(
      { userId: existingUser.id, username: existingUser.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Формирование объекта ответа
    return res.json({
      token,
      id: existingUser.id,
      telegramId: existingUser.telegramId,
      name: existingUser.firstName || existingUser.name,
      role: existingUser?.role?.name || 'User',
      money: existingUser.money,
      totalMoney: existingUser.totalMoney,
      profit: existingUser.profit,
      energy: updatedEnergy,
      rank: existingUser.rank,
      benefit: existingUser.benefit,
      key: existingUser.key,
      combo_daily_tasks: existingUser.combo_daily_tasks,
      reward: {
        reward: filteredData[0]?.reward || null,
        date: filteredData[0]?.Data || null
      },
      wallet: existingUser?.wallet,
      boost: existingUser?.boost
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Универсальная функция для проверки и регенерации энергии
const checkAndRegenerateEnergy = async (user) => {
  const now = new Date();
  const lastUpdate = user.lastEnergyUpdate ? new Date(user.lastEnergyUpdate) : now;
  const secondsSinceLastUpdate = Math.floor((now - lastUpdate) / 1000);
  const limitEnergy = user?.boost?.energiLimit?.level == 1 ? 0 : user?.boost?.energiLimit?.level * 100;

  // Рассчитываем прирост энергии
  const regeneratedEnergy = Math.min(user.energy + secondsSinceLastUpdate, 500 + limitEnergy);
  const newEnergy = Math.min(regeneratedEnergy, 500 + limitEnergy);

  // Обновляем время последнего обновления, если энергия изменилась
  if (newEnergy !== user.energy) {
    await user.update({ energy: newEnergy, lastEnergyUpdate: now });
  }

  return newEnergy;
};

export const addCoins = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const { clicks } = req.body;

  if (clicks <= 0 || !id) {
    return res.status(400).json({ message: 'Invalid value' });
  }

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedEnergy = await checkAndRegenerateEnergy(user);

    if (updatedEnergy <= clicks) {
      return res.status(400).json({ message: 'Insufficient energy to add coins' });
    }

    await User.sequelize.transaction(async (transaction) => {
      const newCoinBalance = user.money + (clicks * user?.boost?.multiplier?.level);
      await user.update(
        {
          money: newCoinBalance,
          energy: updatedEnergy - clicks,
          lastEnergyUpdate: new Date(),
        },
        { transaction }
      );
    });

    const updatedUser = await User.findOne({
      where: { id: user.id },
      attributes: ['id', 'money', 'energy', 'lastEnergyUpdate', 'updatedAt'],
    });

    console.log(`Обновление: ${JSON.stringify(updatedUser)}\n`);

    return res.json({ message: 'Coins added successfully', user: updatedUser });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Маршрут для проверки энергии клиента
export const checkEnergy = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    // Получаем данные пользователя
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Проверяем и обновляем энергию
    let updatedEnergy;
    await User.sequelize.transaction(async (transaction) => {
      updatedEnergy = await checkAndRegenerateEnergy(user, transaction);

      // Обновляем запись пользователя с новым значением энергии и временем последнего обновления
      await user.update(
        { energy: updatedEnergy, lastEnergyUpdate: new Date() },
        { transaction }
      );
    });

    // Повторно получаем обновленные данные пользователя для ответа
    const updatedUser = await User.findOne({
      where: { id: user.id },
      attributes: ['id', 'energy', 'lastEnergyUpdate', 'updatedAt'],
    });

    // Отправляем ответ с обновленным значением энергии
    res.json({ energy: updatedUser.energy });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Контроллер для получения баланса пользователя
export const getUserCoins = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ balance: user.coins || 0 });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const generateReferralLink = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Генерация ссылки
    const referralLink = `${process.env.BOT_URL}?start=${user.telegramId}`;
    await user.update({ referl_link: referralLink });

    return res.json({ referralLink });
  } catch (error) {
    console.error('Error generating referral link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const verifyReferralLink = async (req, res) => {
  const { ref } = req.query;
  const { query_id, user, auth_date, hash } = req.body;

  if (!validateTelegramData({ query_id, user, auth_date, hash }, SECRET_BOT_TOKEN)) {
    return res.status(401).json({ message: 'Invalid Telegram data' });
  }

  try {
    const result = await processReferral({ user, ref });

    if (result.success) {
      return res.json({ message: result.message, user: result.user });
    } else {
      return res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error verifying referral link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const getFriendList = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.Invited || user.Invited.length === 0) {
      console.log("Пользвоатели: ", user);
      return res.json({ friends: [] });
    }

    const referralIds = user.Invited.split(',');

    const friends = await User.findAll({
      where: { telegramId: referralIds },
      attributes: ['id', 'firstName', 'money', 'rank'],
    });

    return res.json({ friends });
  } catch (error) {
    console.error('Error getting friend list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getTask = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id, task } = req.body;

    const user = await User.findOne({ where: { telegramId: id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const Tasks = await Task.findAll({ where: { id: task } });
    if (!Tasks || Tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(Tasks);

    setTimeout(() => addTaskToUser(id, task), 5000);
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkSubscription = async (userIdToCheck, botChannelId) => {

  try {
    // Проверяем статус пользователя в канале
    const chatMember = await bot.getChatMember(botChannelId, userIdToCheck);

    if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
      return true
    } else {
      return false
    }
  } catch (error) {
    console.error('Error checking subscription:', error);

    if (error.response && error.response.body) {
      const errorCode = error.response.body.error_code;

      if (errorCode === 400) {
        return 404
      } else if (errorCode === 403) {
        return 403
      } else {
        return 400
      }
    } else {
      return 500
    }
  }

}

// Функция для добавления задачи пользователю
export const addTaskToUser = async (userId, taskId) => {
  try {
    const user = await User.findOne({ where: { telegramId: userId } });

    if (!user) {
      return false;
    }

    const currentTasks = user.tasks || [];
    const updatedTasks = [...currentTasks, { taskId, completedAt: new Date() }];

    await user.update({ tasks: updatedTasks });

    console.log(`Task ${taskId} added to user ${userId}`);
  } catch (error) {
    console.error('Error adding task to user:', error);
  }
};

export const getMineItems = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    // Проверка токена
    if (!token || !VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    // Получение всех задач из базы
    const tasks = await Daily.findAll();
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'Tasks not found' });
    }

    // Получение пользователя по telegramId
    const user = await User.findOne({ where: { id: id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const daily_combo = await DailyCombo.findAll();
    let test;
    if (tasks && tasks.length > 0) {
      test = daily_combo[0].reward = tasks[0].reward
    }

    // Преобразование daily_tasks в массив
    const upgradedTasks = Array.isArray(user.daily_tasks)
      ? user.daily_tasks
      : JSON.parse(user.daily_tasks || '[]');

    // Обновление задач
    const updatedTasks = tasks.map(task => {
      const taskCopy = { ...task.dataValues };

      const upgradedTask = upgradedTasks.find(ut => ut.id === task.id);

      if (upgradedTask) {
        taskCopy.levels = upgradedTask.levels;
      }

      return taskCopy;
    });

    const count = user?.Invited?.split(',').length
    res.json({ updatedTasks: updatedTasks, unlock: count });
  } catch (error) {
    console.error('Error getting task list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Функция для проверки карточки
const isValidCard = async (obj) => {
  try {
    // Получаем id из переданного объекта
    const { id } = obj;

    // Получаем текущую дату в формате Unix (в миллисекундах)
    const currentDate = Date.now();

    // Ищем карточку с таким id в таблице DailyCombo
    const card = await DailyCombo.findOne({ where: { id } });

    // Если карточка не найдена, возвращаем false
    if (!card) {
      console.log(`Карточка с id ${id} не найдена.`);
      return false;
    }

    // Получаем дату из карточки в формате Unix
    const Data = card.Data;

    // Проверяем, что текущая дата меньше даты истечения
    if (currentDate < Data) {
      return true;
    } else {
      console.log('Дата истечения уже прошла.');
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке карты:', error);
    return false;
  }
};


export const DailyItems = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    // Получаем пользователя по ID
    const user = await User.findOne({ where: { telegramId: id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем все карточки (задачи) для текущего пользователя
    const tasks = await DailyCombo.findAll();
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'Tasks not found' });
    }

    // Проходим по каждой карточке и проверяем её валидность
    const validTasks = tasks.filter(task => {
      return isValidCard(task.id, task.level); // Проверяем карточку с заданными id и level
    });

    // Если валидных карточек меньше, чем в базе, возвращаем ошибку
    if (validTasks.length !== tasks.length) {
      return res.status(400).json({ message: 'Some tasks are expired or do not match the current date.' });
    }

    // Если все карточки валидны, возвращаем их
    res.json(validTasks);
  } catch (error) {
    console.error('Error getting task list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const buyCard = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token' });
    } else if (!VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params; // ID пользователя
    const { daily } = req.body; // ID карточки
    const dayliy = daily;

    // Получение пользователя
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Проверяем и преобразуем daily_tasks
    const currentDailyTasks = Array.isArray(user.daily_tasks)
      ? user.daily_tasks
      : JSON.parse(user.daily_tasks || '[]');

    const allCards = await Daily.findAll({ order: [['id', 'ASC']] });
    const dailyCard = allCards.find((card) => card.id === daily);
    if (!dailyCard) {
      return res.status(404).json({ message: 'Daily card not found' });
    }

    // Логика проверки разблокировки карточек
    const invitedCount = user?.Invited ? user.Invited.split(',').length : 0;
    const isUnlocked = allCards.map((card, index) => index < 6 || index < invitedCount + 6);

    const cardIndex = allCards.findIndex((card) => card.id === daily);
    if (!isUnlocked[cardIndex]) {
      return res.status(400).json({ message: 'Daily card is locked' });
    }

    // Ищем задачу
    let taskFound = currentDailyTasks.find((task) => task.id === dayliy);

    const currentLevel = taskFound ? taskFound.levels : 0;
    const targetLevel = currentLevel < 10 ? currentLevel + 1 : 10;
    // Получаем множитель из карточки
    const multip = currentLevel == 0 ? 0.5 : dailyCard.multip || 1;

    // Рассчитываем итоговую стоимость
    const totalPrice = dailyCard.price * multip * targetLevel;

    // Проверка баланса пользователя
    if (user.money < totalPrice) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!taskFound) {
      // Если задачи нет, добавляем новую
      currentDailyTasks.push({ id: dayliy, levels: 1 });
    } else {
      // Если задача уже существует, обновляем массив
      currentDailyTasks.forEach((task) => {
        if (task.id === dayliy) {
          if (task.levels < 10) task.levels += 1; // Обновляем уровень
        }
      });
    }
    // Добавляем в combo_daily_tasks, если угадано
    const Tru = await isValidCard({ id: dayliy });
    if (Tru) {
      const comboTask = {
        id: dayliy,
        reward: dailyCard.reward,
        date: dailyCard.Data,
      };
    
      // Проверяем и парсим combo_daily_tasks
      let comboDailyTasks;
      try {
        comboDailyTasks = Array.isArray(user.combo_daily_tasks)
          ? user.combo_daily_tasks
          : JSON.parse(user.combo_daily_tasks || '[]');
      } catch (error) {
        console.error('Error parsing combo_daily_tasks:', error);
        comboDailyTasks = [];
      }
    
      // Убеждаемся, что это массив
      if (!Array.isArray(comboDailyTasks)) {
        comboDailyTasks = [];
      }
    
      // Проверяем наличие элемента, чтобы избежать дублирования
      const isDuplicate = comboDailyTasks.some((task) => task.id === dayliy);
      if (!isDuplicate) {
        comboDailyTasks.push(comboTask);
      }
    
      // Сохраняем обновленный массив
      user.combo_daily_tasks = JSON.stringify(comboDailyTasks);
    }
    
    // Сохранение daily_tasks
    user.daily_tasks = JSON.stringify(currentDailyTasks);

    // Вычитание стоимости из баланса
    user.money -= totalPrice;

    // Сохранение обновленного пользователя
    await user.save();

    res.status(200).json({
      message: 'Card purchased successfully',
      user,
      totalPrice,
      targetLevel,
      guessed: Tru,
    });
  } catch (error) {
    console.error('Error processing card purchase:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




export const VerifJWT = (token) => {
  if (!token)
    return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return false;
  }
};

export const refreshToken = (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Генерация нового access-токена
    const newAccessToken = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '15m' });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Failed to refresh token:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};
export const getBoard = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token' });
    } else if (!VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'rank', 'money', 'firstName'], // Получаем только нужные поля
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем первых 20 пользователей с указанными полями, упорядоченных по money
    const users = await User.findAll({
      attributes: ['id', 'rank', 'money', 'firstName'], // Указываем только нужные поля
      limit: 20,
      order: [['money', 'DESC']], // Упорядочивание по убыванию money
    });

    return res.json({ users, user });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const wallet = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token' });
    } else if (!VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    // Проверяем наличие `req.body.wallet`
    if (!req.body.wallet) {
      return res.status(400).json({ message: 'Wallet data is missing' });
    }

    const { wallet, connect } = req.body;
    console.log("PaymentAddress ", wallet)

    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'rank', 'money', 'firstName'],
    });

    if (!user) {
      console.log(req.body)
      return res.status(404).json({ message: 'User not found' });
    }

    // Обновляем `wallet` пользователя в зависимости от значения `connect`
    user.wallet = connect === true ? wallet : null;

    await user.save();

    return res.json({ message: 'Wallet updated successfully' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const checkDaily = async (req, res) => {
  try {
    // Проверка токена авторизации
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    // Проверка валидности JWT
    const verified = await VerifJWT(token);
    if (!verified) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Извлечение userId и массив daily (содержит id: id) из тела запроса
    const { userId, daily } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing user ID in request body' });
    }

    // Поиск пользователя в базе данных
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const winCombo = user?.win_combo || { status: false, date: null };
    const today = Date.now();

    if (winCombo?.status) {
      // развернеите массивв  обратную сторону перед парсингом
      for (const taskId of daily) {
        const isValid = await isValidCard(taskId);
        if (isValid) {
          const daily = await DailyCombo.findOne({ where: taskId });
          if (daily && daily?.Data > today) {
            return res.status(204).send();
          }
        }
      }
    }

    let correctCardsCount = 0;
    let reward = 0;

    for (const taskId of daily) {
      const isValid = await isValidCard(taskId);
      if (isValid) {
        const daily = await DailyCombo.findOne({ where: taskId });
        if (!daily) continue;

        correctCardsCount++;
        if (correctCardsCount === 1) {
          // Получаем награду для первой валидной карты
          reward = daily?.reward || 0;
        }
      }

      // Если валидны 3 карты, фиксируем победу и начисляем награду
      if (correctCardsCount === 3) {
        user.money = (user.money || 0) + reward;
        user.win_combo = {
          status: true,
          date: new Date(), // Фиксируем текущую дату
        };
        await user.save();

        return res.json({ message: 'Daily check successful', reward });
      }
    }

    // Если недостаточно валидных карт
    if (correctCardsCount < 3) {
      return res.status(400).json({ message: 'Not enough correct cards to complete the daily task' });
    }

  } catch (error) {
    console.error('Error checking daily:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const boost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    const verified = await VerifJWT(token);
    if (!verified) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { boost } = req.body; 

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: 'Invalid or missing user ID in request' });
    }
    if (!boost || typeof boost !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing boost in request' });
    }

    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userBoosts = user?.boost;
    const limitEnergy = user?.boost?.energiLimit?.level == 1 ? 0 : user?.boost?.energiLimit?.level * 100;

    console.log(boost)
    if (boost === 'full') {
      const boostData = userBoosts['fullEnergi'];
      const now = Date.now();

      if(!boostData||boostData?.count > 0) {
        const lastUpdate = new Date(boostData.dateLastUpdate).getTime();
         if (now - lastUpdate >= 12 * 60 * 60 * 1000) {
          boostData.dateLastUpdate = new Date();
          userBoosts[boost] = boostData;
          await user.save();
        } 
        return res.status(400).json({message: 'Boost cannot be used yet'});
      }
      if (boostData?.count > 0) {
        // Уменьшаем count и обновляем энергию
        boostData.count -= 1;
        const newEnergy = user.energy = 500 + limitEnergy;
        await user.save();
        return res.json({ 
          count: boostData?.count,
          energy: newEnergy
         });
      }
    } else if (boost == 'Multitap') {
      // Обработка других бустов
      const boostData = userBoosts['multiplier'];
      const targetLevel = boostData.level + 1;
      const k = targetLevel === 2 ? 0.5 : 2;
      const cost = 1000 * targetLevel * k;

      if (user.money >= cost) {
        if (boostData.level < boostData.max_level) {
          // Обновляем уровень буста
          boostData.level += 1;
          const newMMoney = user.money -= cost;
          await user.save();
          return res.json({ 
            money: newMMoney,
            level: targetLevel
           });
        } else {
          return res.status(400).json({ message: `Boost "${boost}" is already at max level` });
        }
      } else {
        return res.status(400).json({ message: 'Not enough money to upgrade boost' });
      }
    } else if (boost == 'Energy limit') {
      // Обработка других бустов
      const boostData = userBoosts['energiLimit'];
      const targetLevel = boostData?.level + 1;
      const k = targetLevel === 1 ? 0.5 : 2;
      const cost = 1000 * targetLevel * k;

      if (user.money >= cost) {
        if (boostData.level < boostData.max_level) {
          // Обновляем уровень буста
          boostData.level += 1;
          const newMMoney = user.money -= cost;
          await user.save();
          return res.json({
            money: newMMoney,
            level: targetLevel
           });
        } else {
          return res.status(400).json({ message: `Boost "${boost}" is already at max level` });
        }
      } else {
        return res.status(400).json({ message: 'Not enough money to upgrade boost' });
      }
    }else {
      return res.status(400).json({ message: 'Invalid or missing boost in request' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Internal server error' });
  }
};
