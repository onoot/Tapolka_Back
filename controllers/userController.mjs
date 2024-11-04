import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import User from '../models/User.mjs';
import Role from '../models/Role.mjs';
import { validateTelegramData } from '../meddleware/verificationTG.mjs';

dotenv.config();

const SECRET_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { JWT_SECRET } = process.env;

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

export const login = async (req, res) => {
  try {
    const { query_id, user, auth_date, hash } = req.body;

    // Валидация данных от Telegram
    if (!validateTelegramData({ query_id, user, auth_date, hash }, SECRET_BOT_TOKEN)) {
      return res.status(401).json({ message: 'Invalid Telegram data' });
    }
    // Проверка или создание пользователя в базе данных
    let existingUser = await User.findOne({
      where: { telegramId: user.telegramId },
      include: { model: Role, attributes: ['name'] },
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
        energy: 1000, // Начальное значение энергии
        rank: 0,
        benefit: 0,
        roleId: 'USER', // Начальная роль
      });
    }

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
      name: existingUser.firstName || existingUser.name ,
      role: existingUser.roleId || 'User',
      money: existingUser.money,
      totalMoney: existingUser.totalMoney,
      profit: existingUser.profit,
      energy: existingUser.energy,
      rank: existingUser.rank,
      benefit: existingUser.benefit,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Функция для проверки и верификации JWT токена
export const VerifJWT = (token) => {
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return false;
  }
};

export const addCoins = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.params;
  const { coins } = req.body;

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.coins += coins;
    await user.save();

    res.json({ message: 'Coins added successfully' });
  } catch (error) {
    console.error('Database error:', error);  
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkEnergy = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token || !VerifJWT(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const { id } = req.params;

  try {
    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const lastUpdate = user.lastEnergyUpdate ? new Date(user.lastEnergyUpdate) : now;
    const secondsSinceLastUpdate = Math.floor((now - lastUpdate) / 1000);

    // Рассчитываем прирост энергии
    const regeneratedEnergy = Math.min(user.energy + secondsSinceLastUpdate, 1600);
    const newEnergy = Math.min(regeneratedEnergy, 1600);

    // Обновляем время последнего обновления и сохраняем данные
    user.energy = newEnergy;
    user.lastEnergyUpdate = now;
    await user.save();

    res.json({ energy: user.energy });
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
