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
app.use(cors());

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
app.use('*', apiRouter);

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
