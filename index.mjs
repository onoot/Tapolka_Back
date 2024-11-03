import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import User from './models/User.mjs';
// import { login, getUserCoins, parseTelegramData, validateTelegramInitData } from './controllers/userController.mjs';
import apiRouter from './routes/userRoutes.mjs';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

const bot = new TelegramBot(token, { polling: true });
const app = express();
const buildPath = path.join(__dirname, 'build');

app.use(express.json());
app.use(cors());
app.use(express.static(buildPath));

// Обработка сообщения от пользователя
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        const userId = msg.from.id;
        let user = await User.findOne({ where: { telegramId: userId } });
        
        if (!user) {
            user = await User.create({
                telegramId: userId,
                firstName: msg.from.first_name,
                lastName: msg.from.last_name || null,
            });
            await bot.sendMessage(chatId, 'Добро пожаловать! Вы зарегистрированы, у вас 0 монет.');
        } else {
            await bot.sendMessage(chatId, 'Вы уже зарегистрированы.');
        }
    }
});
app.use('/api', apiRouter);

// Все остальные маршруты отправляют index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
