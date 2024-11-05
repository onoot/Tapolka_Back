import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
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

app.use((err, req, res, next) => {
    if (err instanceof URIError) {
        console.error("URIError detected: ", err.message);
        res.status(400).send("Bad Request");
    } else {
        next(err);
    }
});

// SSL-конфигурация
const sslOptions = {
    key: fs.readFileSync(' /etc/letsencrypt/live/app.tongaroo.fun/privkey.pem'),   
    cert: fs.readFileSync('/etc/letsencrypt/live/app.tongaroo.fun/fullchain.pem'),  
};

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

// Настройка HTTPS-сервера
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server started on port ${HTTPS_PORT}`);
});

// Настройка HTTP-сервера для перенаправления на HTTPS
const HTTP_PORT = process.env.HTTP_PORT || 80;
http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
}).listen(HTTP_PORT, () => {
    console.log(`HTTP Server started on port ${HTTP_PORT} and redirecting to HTTPS`);
});
