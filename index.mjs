import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // Импортируем path
import { fileURLToPath } from 'url'; // Импортируем, чтобы создать __dirname
import User from './models/User.mjs';
import apiRouter from './routes/userRoutes.mjs';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(express.json());
app.use(cors());

// Определяем __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Укажите путь к папке build
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// Обработка команды /start для Telegram бота
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

// API маршруты
app.use('/api', apiRouter);

// Все остальные маршруты отправляют index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
