import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import User from '../models/User.mjs';
import Role from '../models/Role.mjs';
import Task from '../models/Task.mjs';
import Daily from '../models/Daily.mjs';
import { validateTelegramData } from '../meddleware/verificationTG.mjs';
import { processReferral } from '../meddleware/checkRef.mjs';

dotenv.config();

const SECRET_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { JWT_SECRET } = process.env;
const { JWT_REFRESH_SECRET } = process.env;

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
        key: 0,
      });
    }

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
      role: existingUser.role.name || 'User',
      money: existingUser.money,
      totalMoney: existingUser.totalMoney,
      profit: existingUser.profit,
      energy: updatedEnergy,
      rank: existingUser.rank,
      benefit: existingUser.benefit,
      key: existingUser.key,
      // existingUser: existingUser.toJSON(),
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

  // Рассчитываем прирост энергии
  const regeneratedEnergy = Math.min(user.energy + secondsSinceLastUpdate, 1600);
  const newEnergy = Math.min(regeneratedEnergy, 1600);

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
      const newCoinBalance = user.money + clicks;
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
      console.log("Пользвоатели: ",user);
      return res.json({ friends: [] });
    }

    const referralIds = user.Invited.split(',');

    const friends = await User.findAll({
      where: { telegramId: referralIds },
      attributes: ['id', 'firstName', 'benefit', 'rank'],
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

    if (!token || !VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const tasks = await Daily.findAll();
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'Tasks not found' });
    }

    const user = await User.findOne({ where: { telegramId: id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Проверяем прокаченные задачи в user.daily_tasks
    const upgradedTasks = user.daily_tasks || {};
    const updatedTasks = tasks.map(task => {
      const updatedTask = { ...task.dataValues }; // Создаем копию данных задачи

      // Если есть информация о прокачанном уровне, обновляем поле levels
      if (upgradedTasks[task.id]) {
        updatedTask.levels = upgradedTasks[task.id];
      }

      return updatedTask;
    });

    res.json(updatedTasks);
  } catch (error) {
    console.error('Error getting task list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDailyItems = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const user = await User.findOne({ where: { telegramId: id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tasks = await DailyCombo.findAll();
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'Tasks not found' });
    }
    res.json(tasks);
  } catch (error) {
    console.error('Error getting task list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const buyCard = async (req, res) => {
  try {
    console.log(req.body);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token' });
    } else if (!VerifJWT(token)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params; // ID пользователя
    const { dayliy } = req.body; // ID карточки

    // Получение пользователя
    const user = await User.findOne({ where: { id: id } });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Получение карточки
    const dailyCard = await Daily.findOne({ where: { id: dayliy } });
    if (!dailyCard) {
      console.log('Daily card not found');
      return res.status(404).json({ message: 'Daily card not found' });
    }

    // Проверка баланса пользователя
    if (user.money < dailyCard.price) {
      console.log(user.money, dailyCard.price);
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Проверяем, есть ли задача уже в списке
    const currentDailyTasks = user.daily_tasks || [];
    let taskFound = currentDailyTasks.find((task) => task.id === dayliy);

    if (!taskFound) {
      // Если задачи нет, добавляем с `levels: 1`
      taskFound = { id: dayliy, levels: 1 };
      currentDailyTasks.push(taskFound);
    } else {
      // Если задача есть, увеличиваем `levels`
      taskFound.levels += 1;
    }

    // Обновляем поле daily_tasks
    user.daily_tasks = currentDailyTasks;

    // Вычитание стоимости карточки из баланса
    user.money -= dailyCard.price;

    // Сохранение обновлений
    await user.save();

    res.status(200).json({ message: 'Card purchased successfully', user });
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