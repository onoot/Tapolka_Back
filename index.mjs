import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { saveServerAddress } from './utils/saveServer.mjs';
import apiRouter from './routes/userRoutes.mjs';
import Check from './controllers/checkHel.mjs';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: ['https://tongaroo.fun', 'http://localhost:3000'],
    credentials: true
}));

// Обработка ошибок CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Middleware для обработки URI ошибок
app.use((err, req, res, next) => {
    if (err instanceof URIError) {
        console.error("URIError detected: ", err.message);
        res.status(400).send("Bad Request");
    } else {
        next(err);
    }
});

// Маршрут для проверки связи с базой данных
app.get('/health', Check.checkDatabase);

// API маршруты
app.use('/', apiRouter);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const HTTP_PORT = process.env.HTTP_PORT || 80;
http.createServer(app).listen(HTTP_PORT, async () => {
    console.log(`HTTP Server started on port ${HTTP_PORT}`);

    // Сохраняем информацию о сервере после его запуска
    try {
        await saveServerAddress(HTTP_PORT);
        console.log('Server address saved successfully.');
    } catch (error) {
        console.error('Error saving server address:', error.message);
    }
});
